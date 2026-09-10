import { randomUUID, createHash } from 'node:crypto';
import { getCookie, setCookie } from 'hono/cookie';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { requireUser, sessionUser } from './auth.js';
import { digest, idToken, throttle } from './security.js';

const scope = 'market:read analysis:draft';
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export function mountMcpOAuth(app, db, config) {
  const resource = config.origin + '/mcp';
  const configured = () => {
    try { return !!config.mcpClientId && new URL(config.mcpRedirectUri).protocol === 'https:' && !new URL(config.mcpRedirectUri).hash; } catch { return false; }
  };
  app.get('/.well-known/oauth-protected-resource/mcp', c => c.json({ resource, authorization_servers: [config.origin], scopes_supported: scope.split(' '), bearer_methods_supported: ['header'] }));
  app.get('/.well-known/oauth-authorization-server', c => c.json({ issuer: config.origin, authorization_endpoint: config.origin + '/oauth/authorize', token_endpoint: config.origin + '/oauth/token', revocation_endpoint: config.origin + '/oauth/revoke', response_types_supported: ['code'], grant_types_supported: ['authorization_code'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: scope.split(' ') }));
  app.use('/oauth/*', bodyLimit({ maxSize: 12000 }));
  app.use('/oauth/*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    c.header('Referrer-Policy', 'same-origin');
    if (!configured()) return c.json({ error: 'temporarily_unavailable' }, 503);
    // Browsers apply form-action to the redirect after submitting consent too.
    c.header('Content-Security-Policy', `default-src 'none'; form-action 'self' ${new URL(config.mcpRedirectUri).origin}; frame-ancestors 'none'; base-uri 'none'`);
    await next();
  });
  app.get('/oauth/authorize', async c => {
    const p = c.req.query();
    if (p.client_id !== config.mcpClientId || p.redirect_uri !== config.mcpRedirectUri || p.resource !== resource || p.response_type !== 'code' || p.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(p.code_challenge ?? '') || p.scope !== scope || (p.state?.length ?? 0) > 1024) return c.json({ error: 'invalid_request' }, 400);
    if (!await sessionUser(c, db)) {
      setCookie(c, 'mcp_return', '/oauth/authorize?' + new URLSearchParams(p).toString(), { httpOnly: true, secure: config.origin.startsWith('https:'), sameSite: 'Lax', path: '/', maxAge: 600 });
      return c.redirect('/login');
    }
    const user = await requireUser(c, db, true);
    await throttle(db, 'mcp-consent:' + user.id, 30, 3600);
    const id = randomUUID();
    await db.query("INSERT INTO mcp_oauth_requests(id,actor,session_hash,params,expires_at) VALUES($1,$2,$3,$4,now()+interval '5 minutes')", [id, user.id, digest(getCookie(c, 'session')), p]);
    return c.html(`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>เชื่อม Polylove MCP</title><main><h1>อนุญาตการเชื่อม MCP หรือไม่?</h1><p>บัญชี: ${escape(user.email)}</p><p>แอป: ${escape(config.mcpClientId)}</p><p>ส่งกลับไปยัง: ${escape(config.mcpRedirectUri)}</p><p>อ่านข่าวและข้อมูลตลาด และส่งบทวิเคราะห์เป็นร่างเท่านั้น ไม่เผยแพร่หรือเข้าถึงข้อมูลสมาชิก</p><p>สิทธิ์มีอายุหนึ่งชั่วโมง และสิ้นสุดเมื่อเซสชันนี้ถูกยกเลิก</p><form method="post"><input type="hidden" name="request_id" value="${id}"><button name="decision" value="allow">อนุญาต</button> <button name="decision" value="deny">ปฏิเสธ</button></form></main></html>`);
  });
  app.post('/oauth/authorize', async c => {
    if (c.req.header('origin') !== config.origin) return c.json({ error: 'access_denied' }, 403);
    const user = await requireUser(c, db, true);
    const form = await c.req.parseBody();
    if (!z.uuid().safeParse(form.request_id).success || !['allow','deny'].includes(form.decision)) return c.json({ error: 'invalid_request' }, 400);
    const outcome = await db.transaction(async tx => {
      const { rows: [r] } = await tx.query('SELECT * FROM mcp_oauth_requests WHERE id=$1 AND actor=$2 AND session_hash=$3 AND code_hash IS NULL AND expires_at>now() FOR UPDATE', [form.request_id, user.id, digest(getCookie(c, 'session'))]);
      if (!r) return null;
      const url = new URL(config.mcpRedirectUri);
      if (r.params.client_id !== config.mcpClientId || r.params.redirect_uri !== config.mcpRedirectUri) return null;
      if (r.params.state !== undefined) url.searchParams.set('state', r.params.state);
      url.searchParams.set('iss', config.origin);
      if (form.decision === 'deny') {
        await tx.query('DELETE FROM mcp_oauth_requests WHERE id=$1', [r.id]);
        url.searchParams.set('error', 'access_denied');
      } else {
        const code = idToken();
        await tx.query("UPDATE mcp_oauth_requests SET code_hash=$1,expires_at=now()+interval '5 minutes' WHERE id=$2", [digest(code), r.id]);
        await tx.query("INSERT INTO audit(id,actor,action,details) VALUES($1,$2,'mcp.consent',$3)", [randomUUID(), user.id, { client_id: config.mcpClientId, scope }]);
        url.searchParams.set('code', code);
      }
      return url.toString();
    });
    return outcome ? c.redirect(outcome, 303) : c.json({ error: 'invalid_request' }, 400);
  });
  app.post('/oauth/token', async c => {
    const p = await c.req.parseBody();
    if (p.grant_type !== 'authorization_code' || p.client_id !== config.mcpClientId || p.redirect_uri !== config.mcpRedirectUri || p.resource !== resource || !/^[A-Za-z0-9_-]{43}$/.test(p.code ?? '') || !/^[A-Za-z0-9._~-]{43,128}$/.test(p.code_verifier ?? '')) return c.json({ error: 'invalid_request' }, 400);
    const token = await db.transaction(async tx => {
      const { rows: [r] } = await tx.query("SELECT r.* FROM mcp_oauth_requests r JOIN users u ON u.id=r.actor JOIN sessions s ON s.hash=r.session_hash WHERE r.code_hash=$1 AND r.expires_at>now() AND s.expires_at>now() AND u.role='admin' AND u.email_verified_at IS NOT NULL AND NOT u.suspended FOR UPDATE OF r", [digest(p.code)]);
      if (!r || r.params.client_id !== p.client_id || r.params.redirect_uri !== p.redirect_uri || r.params.resource !== p.resource || createHash('sha256').update(p.code_verifier).digest('base64url') !== r.params.code_challenge) return null;
      await tx.query('DELETE FROM mcp_oauth_requests WHERE id=$1', [r.id]);
      const access = idToken();
      await tx.query("INSERT INTO mcp_oauth_tokens(hash,actor,session_hash,client_id,resource,scope,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '1 hour')", [digest(access), r.actor, r.session_hash, p.client_id, resource, scope]);
      return access;
    });
    return token ? c.json({ access_token: token, token_type: 'Bearer', expires_in: 3600, scope }) : c.json({ error: 'invalid_grant' }, 400);
  });
  app.post('/oauth/revoke', async c => {
    const p = await c.req.parseBody();
    if (p.client_id !== config.mcpClientId || typeof p.token !== 'string' || p.token.length > 128) return c.json({ error: 'invalid_request' }, 400);
    await db.query('DELETE FROM mcp_oauth_tokens WHERE hash=$1 AND client_id=$2', [digest(p.token), p.client_id]);
    return c.body(null, 200);
  });
}

export async function oauthActor(db, token, config) {
  return (await db.query("SELECT t.actor FROM mcp_oauth_tokens t JOIN sessions s ON s.hash=t.session_hash JOIN users u ON u.id=t.actor WHERE t.hash=$1 AND t.expires_at>now() AND s.expires_at>now() AND t.resource=$2 AND t.scope=$3 AND t.client_id=$4 AND u.role='admin' AND u.email_verified_at IS NOT NULL AND NOT u.suspended", [digest(token), config.origin + '/mcp', scope, config.mcpClientId ?? ''])).rows[0]?.actor;
}

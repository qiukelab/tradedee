import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { connectDb, migrate } from '../../api/src/db.js';
import { createPlatform } from '../../api/src/platform.js';
import { digest } from '../../api/src/security.js';

if (!process.env.TEST_DATABASE_URL?.includes(':55432/')) throw new Error('Requires isolated PostgreSQL on port 55432');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = connectDb();
await migrate(db);
const actor = randomUUID(), session = randomUUID(), token = randomUUID();
const config = { origin: 'http://127.0.0.1', mcpClientId: 'browser-client', mcpRedirectUri: 'https://client.example/callback' };
const app = new Hono();
const server = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' });
await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
config.origin = 'http://127.0.0.1:' + server.address().port;
app.route('/', createPlatform({ db, config }));
app.get('*', serveStatic({ root: './apps/web/dist' }));
app.get('*', serveStatic({ path: './apps/web/dist/index.html' }));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  await db.query("INSERT INTO users(id,email,name,role,email_verified_at) VALUES($1,$2,'MCP browser admin','admin',now())", [actor, actor + '@example.test']);
  await db.query("INSERT INTO sessions(hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')", [digest(session), actor]);
  await db.query("INSERT INTO mcp_oauth_tokens(hash,actor,session_hash,client_id,resource,scope,expires_at) VALUES($1,$2,$3,$4,$5,'market:read analysis:draft',now()+interval '1 hour')", [digest(token), actor, digest(session), config.mcpClientId, config.origin + '/mcp']);
  const context = await browser.newContext();
  await context.addCookies([{ name: 'session', value: session, url: config.origin, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440,390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(config.origin + '/admin');
    await page.getByRole('button', { name: 'MCP', exact: true }).click();
    await page.getByRole('heading', { name: 'สิทธิ์ OAuth ของฉัน' }).waitFor();
    await page.getByText(/browser-client · 1 สิทธิ์/).waitFor();
    assert.deepEqual((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()).violations.map(v => v.id), []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.getByRole('button', { name: 'ตัดสิทธิ์ OAuth MCP ทั้งหมดของฉัน' }).click();
  await page.getByText('ไม่มีสิทธิ์ที่ยังใช้งานได้').waitFor();
  assert.equal((await db.query('SELECT count(*)::int n FROM mcp_oauth_tokens WHERE actor=$1', [actor])).rows[0].n, 0);
  // Intercept only the test client's callback; no external service receives the code.
  await context.route('**/*', route => route.request().url().startsWith(config.mcpRedirectUri) ? route.fulfill({ contentType: 'text/html', body: '<h1>Test client callback</h1>' }) : route.continue());
  const verifier = 'p'.repeat(43);
  const params = { client_id: config.mcpClientId, redirect_uri: config.mcpRedirectUri, resource: config.origin + '/mcp', response_type: 'code', scope: 'market:read analysis:draft', code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'), state: 'browser-test' };
  await page.goto(config.origin + '/oauth/authorize?' + new URLSearchParams(params));
  await page.getByRole('heading', { name: 'อนุญาตการเชื่อม MCP หรือไม่?' }).waitFor();
  assert.deepEqual((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()).violations.map(v => v.id), []);
  await page.getByRole('button', { name: 'อนุญาต', exact: true }).click();
  await page.waitForURL('https://client.example/callback?**');
  await page.getByRole('heading', { name: 'Test client callback' }).waitFor();
  const callback = new URL(page.url());
  assert.equal(callback.searchParams.get('state'), 'browser-test');
  const exchanged = await context.request.post(config.origin + '/oauth/token', { form: { client_id: params.client_id, redirect_uri: params.redirect_uri, resource: params.resource, grant_type: 'authorization_code', code: callback.searchParams.get('code'), code_verifier: verifier } });
  assert.equal(exchanged.status(), 200);
  const access = (await exchanged.json()).access_token;
  const headers = { authorization: 'Bearer ' + access, accept: 'application/json, text/event-stream' };
  const tools = await context.request.post(config.origin + '/mcp', { headers, data: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} } });
  assert.equal(tools.status(), 200);
  assert.equal((await tools.json()).result.tools.length, 3);
  await context.request.post(config.origin + '/oauth/revoke', { form: { client_id: params.client_id, token: access } });
  assert.equal((await context.request.post(config.origin + '/mcp', { headers, data: { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} } })).status(), 401);
  assert.deepEqual(errors, []);
  console.log('PASS: admin MCP desktop/mobile, accessibility, consent, PKCE exchange, HTTP tools and revoked access');
} finally {
  await browser.close();
  await db.query('DELETE FROM users WHERE id=$1', [actor]);
  await new Promise(resolve => server.close(resolve));
  await db.close();
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolveLocalAdmin } from './mcp-local.js';

test('local MCP selects exactly one active verified admin unless explicitly configured', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  await assert.rejects(resolveLocalAdmin(db));
  const id = randomUUID();
  await db.query("INSERT INTO users(id,email,name,role,email_verified_at) VALUES($1,'admin@local.test','Admin','admin',now())", [id]);
  assert.equal(await resolveLocalAdmin(db), id);
  assert.equal(await resolveLocalAdmin(db, 'configured-id'), 'configured-id');
  await db.query("INSERT INTO users(id,email,name,role,email_verified_at) VALUES($1,'other@local.test','Other','admin',now())", [randomUUID()]);
  await assert.rejects(resolveLocalAdmin(db));
});

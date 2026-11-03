import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestAdminLogin } from './adminLogin.js';

const success = { token: 'stored-token', admin: { id: 1 } };
test('normalizes email and preserves password whitespace', async () => {
  const client = { post: async (url, body) => {
    assert.equal(url, 'https://example.test/api/admin/login');
    assert.deepEqual(body, { email: 'admin@example.test', password: ' secret ' });
    return { data: success };
  } };
  assert.deepEqual(await requestAdminLogin(client, 'https://example.test/', ' Admin@Example.test ', ' secret '), success);
});

for (const status of [401, 422, 429, 500, undefined]) {
  test(`does not retry credentials after ${status || 'network failure'}`, async () => {
    let calls = 0;
    const client = { post: async () => {
      calls++;
      throw { response: status ? { status, data: { message: 'Rejected' } } : undefined };
    } };
    await assert.rejects(requestAdminLogin(client, '', 'a@b.test', 'secret'),
      status >= 500 || !status ? /temporarily unavailable/ : /Rejected/);
    assert.equal(calls, 1);
  });
}

for (const first of ['html', 'malformed', 404, 405]) {
  test(`falls back on ${first} within the configured API host`, async () => {
    const urls = [];
    const client = { post: async url => {
      urls.push(url);
      if (urls.length > 1) return { data: success };
      if (typeof first === 'number') throw { response: { status: first } };
      return { data: first === 'html' ? '<!DOCTYPE html><html></html>' : { message: 'Not a login response' } };
    } };
    assert.deepEqual(await requestAdminLogin(client, 'https://example.test', 'a@b.test', 'secret'), success);
    assert.deepEqual(urls, ['https://example.test/api/admin/login', 'https://example.test/api_admin.php?action=login']);
  });
}

test('rejects invalid success responses', async () => {
  await assert.rejects(requestAdminLogin({ post: async () => ({ data: '<html></html>' }) }, '', 'a@b.test', 'secret'), /invalid response/);
});

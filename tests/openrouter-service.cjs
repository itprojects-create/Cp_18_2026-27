'use strict';
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const Service = require('../src/mistral-service');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const result = { speech: 'Opening LinkedIn', actions: [{ type: 'navigate', url: 'https://www.linkedin.com' }], taskComplete: false };
const success = () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(result) } }] }) });

test('uses OpenRouter authentication, configured model, JSON mode and recent history', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'mistralai/configured-model');
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.equal(body.max_tokens, 1200);
    assert.equal(body.messages.length, 14);
    assert.equal(body.messages[1].content, '8');
    assert.equal(body.messages.at(-1).content, 'open linkedin');
    return success();
  };
  const history = Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: String(i) }));
  assert.deepEqual(await new Service('test-key', 'mistralai/configured-model').processCommand('open linkedin', null, history), result);
});

test('rejects missing keys without making a request', async () => {
  global.fetch = async () => { throw Error('Should not send a request'); };
  await assert.rejects(new Service('').processCommand('hello'), /No OpenRouter API key/);
});

test('ISL plain-text completions share the configured provider without agent JSON mode', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer isl-test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'mistralai/isl-model');
    assert.equal(body.response_format, undefined);
    assert.equal(body.max_tokens, 512);
    assert.deepEqual(body.messages, [{ role: 'user', content: 'Convert to ISL gloss' }]);
    return { ok: true, json: async () => ({ choices: [{ message: { content: '  YOU NAME TYPE  ' } }] }) };
  };
  assert.equal(await new Service('isl-test-key', 'mistralai/isl-model').complete([{ role: 'user', content: 'Convert to ISL gloss' }]), 'YOU NAME TYPE');
});

test('reports provider authentication errors without retrying', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; return { ok: false, status: 401, json: async () => ({ error: { message: 'Invalid API key' } }) }; };
  await assert.rejects(new Service('test-key').processCommand('hello'), /OpenRouter request failed \(401\): Invalid API key/);
  assert.equal(calls, 1);
});

test('rotates rate-limited keys and stops after trying every key', async () => {
  const keys = [];
  global.fetch = async (_url, options) => {
    keys.push(options.headers.Authorization);
    return keys.length === 1 ? { ok: false, status: 429, json: async () => ({ error: { message: 'Rate limited' } }) } : success();
  };
  assert.deepEqual(await new Service('first-key,second-key').processCommand('hello'), result);
  assert.deepEqual(keys, ['Bearer first-key', 'Bearer second-key']);
  let calls = 0;
  global.fetch = async () => { calls++; return { ok: false, status: 429, json: async () => ({ error: { message: 'Rate limited' } }) }; };
  await assert.rejects(new Service('first-key,second-key').processCommand('hello'), /All configured OpenRouter keys/);
  assert.equal(calls, 2);
});

test('rejects empty provider responses', async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [] }) });
  await assert.rejects(new Service('test-key').processCommand('hello'), /OpenRouter returned an empty response/);
});

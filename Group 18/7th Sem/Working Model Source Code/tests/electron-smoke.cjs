'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ishaara-smoke-'));
app.setPath('userData', testDir);
process.env.ISHAARA_CONFIG_PATH = path.join(testDir, '.env');
fs.writeFileSync(process.env.ISHAARA_CONFIG_PATH, 'OPENROUTER_API_KEY=test-key\nOPENROUTER_MODEL=mistralai/test-model\n');
process.env.GROQ_API_KEY = 'test-groq-key';
const errors = [];
let commands = 0;
const islRequests = [];
const Service = require('../src/mistral-service');
Service.prototype.processCommand = async function(command) {
  commands++;
  if (command === 'test rejection') throw Error('Test backend failure');
  return { speech: 'Test response', explanation: 'Command processed', actions: [], taskComplete: true };
};
// Deterministic API fixtures: integration tests never call paid external services.
global.fetch = async (url, options) => {
  if (String(url) === 'https://openrouter.ai/api/v1/chat/completions') {
    const body = JSON.parse(options.body);
    if (options.headers.Authorization !== 'Bearer updated-test-key' || body.model !== 'mistralai/updated-model' || body.response_format) throw Error('ISL did not use the configured OpenRouter plain-text request');
    const prompt = body.messages[0].content;
    islRequests.push(prompt);
    const content = prompt.includes('ISL Gloss:') ? 'YOU NAME TYPE SUBMIT' : 'Enter your name. Submit the form.';
    return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
  }
  if (String(url).includes('audio/transcriptions')) {
    if (!(options.body instanceof FormData)) throw Error('Expected native multipart FormData');
    return { ok: true, json: async () => ({ text: 'Test transcript' }) };
  }
  return { ok: false, status: 503, json: async () => ({ message: 'Test API unavailable' }) };
};
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (_e, level, message) => {
    if (level === 3 && !/WebGL|GPU|ContextResult|Test backend failure|Sarvam/.test(message)) errors.push(message);
  });
  contents.on('preload-error', (_e, _file, error) => errors.push(error.message));
});
require('../main');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, description) {
  for (let i = 0; i < 100; i++) { if (await predicate()) return; await delay(100); }
  throw Error(`Timeout: ${description}`);
}
app.whenReady().then(async () => {
  await waitFor(() => BrowserWindow.getAllWindows().length, 'app window');
  const win = BrowserWindow.getAllWindows()[0];
  const run = code => win.webContents.executeJavaScript(code);
  await waitFor(() => run(`typeof activeTabId !== 'undefined' && activeTabId !== null`).catch(() => false), 'frontend initialization');
  await waitFor(() => run(`!$('main-webview').isLoading() && !!$('main-webview').getURL()`), 'home load');
  const results = [];
  async function check(name, code) {
    if (!await run(`(async()=>{${code}})()`)) throw Error(`FAIL: ${name}`);
    results.push(name);
  }
  await run('state.muted = true');
  await check('OpenRouter configuration loaded', `return (await window.electronAPI.getApiKey())==='test-key' && $('input-api-key').value.startsWith('•') && $('sel-model').value==='mistralai/test-model';`);
  await check('OpenRouter settings persist', `await window.electronAPI.setApiKey('updated-test-key'); await window.electronAPI.setModel('mistralai/updated-model'); return (await window.electronAPI.getApiKey())==='updated-test-key' && (await window.electronAPI.getModel())==='mistralai/updated-model';`);
  const savedConfig = fs.readFileSync(process.env.ISHAARA_CONFIG_PATH, 'utf8');
  if (!savedConfig.includes('OPENROUTER_API_KEY="updated-test-key"') || !savedConfig.includes('OPENROUTER_MODEL="mistralai/updated-model"')) throw Error('OpenRouter settings not persisted');
  if (process.argv.includes('--provider-only')) {
    await check('OpenRouter chat IPC', `const result=await window.electronAPI.queryMistral({command:'test command',pageContext:null,history:[]}); return result.success&&result.data.speech==='Test response';`);
    await check('Explain this Page summary, gloss and signing handoff', `
      window.AvatarAnimator=function(){this.init=()=>{};this.signWithCaptions=(gloss,summary)=>{window.testSigning={gloss,summary};};this.stop=()=>{};};
      $('tab-isl').click(); await sleep(100); $('isl-btn-explain').click();
      for(let i=0;i<50&&!window.testSigning;i++) await sleep(100);
      return window.testSigning?.gloss==='YOU NAME TYPE SUBMIT' && window.testSigning?.summary==='Enter your name. Submit the form.' && !$('isl-summary').hidden && $('isl-error').hidden && !$('isl-btn-stop').hidden;
    `);
    if (islRequests.length !== 2 || !islRequests[1].includes('Enter your name. Submit the form.')) throw Error('ISL summary did not flow into gloss conversion');
    console.log(JSON.stringify({ passed: results, commands }, null, 2));
    app.exit(0);
    return;
  }
  await check('settings open/close', `$('btn-settings').click(); const open=!$('settings-modal').hidden; $('close-settings').click(); return open && $('settings-modal').hidden;`);
  await check('panel hide/show', `$('btn-close-panel').click(); const closed=$('ai-panel').classList.contains('hidden'); $('btn-toggle-panel').click(); return closed&&!$('ai-panel').classList.contains('hidden');`);
  await check('drawer open/close', `$('btn-a11y').click(); const open=!$('a11y-drawer').hidden; $('close-a11y').click(); return open&&$('a11y-drawer').hidden;`);
  for (const [id, key] of [['qp-contrast','highContrast'],['qp-links','highlightLinks'],['qp-dyslexia','dyslexia'],['dr-spacing','spacing'],['dr-cursor','largeCursor'],['dr-focus','focusMode'],['dr-noani','reduceMotion'],['dr-guide','readingGuide'],['dr-captions','captions'],['dr-autoread','autoRead'],['dr-sticky','stickyKeys']]) {
    await check(id, `const initial=state.a11y.${key}; $('${id}').click(); await sleep(60); const enabled=state.a11y.${key}!==initial; $('${id}').click(); await sleep(60); return enabled&&state.a11y.${key}===initial;`);
  }
  await check('zoom controls', `$('qp-zoom').click(); const zoom=state.a11y.zoom; $('dr-zoom').value='1'; $('dr-zoom').dispatchEvent(new Event('input')); return zoom>1&&state.a11y.zoom===1;`);
  await check('typed send and backend IPC', `$('cmd-input').value='test command'; $('send-btn').click(); await sleep(250); return $('chat-log').textContent.includes('Command processed')&&$('stop-action-btn').style.display==='none';`);
  await check('new chat', `$('btn-new-chat').click(); return state.chatHist.length===0&&!$('chat-log').textContent.includes('Command processed');`);
  await check('backend failure shown', `await processCmd('test rejection'); return $('chat-log').textContent.includes('Test backend failure');`);
  await check('new tab and close', `const count=tabs.size; $('btn-new-tab').click(); await sleep(150); const created=tabs.size===count+1; closeTab(activeTabId); await sleep(150); return created&&tabs.size===count;`);
  await check('Groq audio multipart backend', `const result=await window.electronAPI.groqWhisper({audioBase64:'dGVzdA==',mimeType:'audio/webm'}); return result.success&&result.transcript==='Test transcript';`);
  console.log(JSON.stringify({ passed: results, commands, frontendErrors: errors }, null, 2));
  if (errors.length) throw Error('Frontend errors detected');
  app.exit(0);
}).catch(error => { console.error(error.message); console.error(JSON.stringify(errors)); app.exit(1); });
setTimeout(() => { console.error('Smoke test exceeded 45 seconds'); app.exit(1); }, 45000).unref();

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const group = path.resolve(__dirname, '../../..');
const root = path.dirname(group);
const markdown = [];
const failures = [];
let checked = 0;
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) { if (!['node_modules', '.git', 'dist', 'dist-ssr'].includes(item.name)) walk(file); }
    else if (item.name.endsWith('.md')) markdown.push(file);
    else if (/\.(pdf|docx)$/.test(item.name) && fs.statSync(file).size === 0) failures.push(`Empty document: ${path.relative(root, file)}`);
  }
}
walk(group);
for (const file of markdown) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const local = path.resolve(path.dirname(file), decodeURIComponent(target.split('#')[0]));
    checked++;
    if (!fs.existsSync(local)) failures.push(`${path.relative(root, file)}: missing ${target}`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${checked} relative links resolve across ${markdown.length} indexes; no empty PDF or Word documents.`);

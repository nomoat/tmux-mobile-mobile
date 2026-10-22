#!/usr/bin/env node
// Bundle the canonical Web contract, never maintain a second action order.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source');
const source = sourceIndex >= 0 ? args[sourceIndex + 1] : '../tmux-mobile/public/card-actions.js';
if (!source) throw new Error('--source requires a local file or HTTPS URL');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'sources/tmux-mobile/card-actions.js');
const metadata = resolve(root, 'sources/tmux-mobile/card-actions.source.json');
const load = async path => {
  if (!path.startsWith('https://')) return readFile(path, 'utf8');
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot read card action contract: HTTP ${response.status}`);
  return response.text();
};
const content = await load(source);
const license = await load(source.replace(/\.js$/, '.LICENSE'));
const receipt = JSON.stringify({ source: 'cjzeroxaa/tmux-mobile:public/card-actions.js', sha256: createHash('sha256').update(content).digest('hex') }, null, 2) + '\n';
if (args.includes('--check')) {
  if (await readFile(target, 'utf8') !== content || await readFile(metadata, 'utf8') !== receipt || await readFile(target.replace(/\.js$/, '.LICENSE'), 'utf8') !== license) {
    throw new Error('Card actions differ from Web. Run scripts/sync-card-actions.mjs, then test and commit.');
  }
  console.log('Card action order, labels and icon geometry match Web.');
} else {
  await writeFile(target, content);
  await writeFile(target.replace(/\.js$/, '.LICENSE'), license);
  await writeFile(metadata, receipt);
  console.log('Bundled canonical card actions and license.');
}

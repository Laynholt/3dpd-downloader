// Writes 3dpd-downloader.meta.js (header only, used by script managers to check for updates).
// `node build.mjs --check` fails if the meta file is stale.
import { readFileSync, writeFileSync } from 'node:fs';
const end = '// ==/UserScript==';
const script = readFileSync(new URL('./3dpd-downloader.user.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const meta = script.slice(0, script.indexOf(end) + end.length) + '\n';
const target = new URL('./3dpd-downloader.meta.js', import.meta.url);
if (!process.argv.includes('--check')) writeFileSync(target, meta);
else if (readFileSync(target, 'utf8') !== meta) throw new Error('3dpd-downloader.meta.js is stale: run node build.mjs');

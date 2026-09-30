// SPDX-License-Identifier: MIT
import http from 'node:http';
import path from 'node:path';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const [buildArg, outputArg] = process.argv.slice(2);
if (!buildArg || !outputArg) throw Error('Usage: node run-render-probe.mjs EXTERNAL_BUILD FRESH_EVIDENCE_DIR');
const root = path.resolve(import.meta.dirname, '../../../..');
const build = path.resolve(buildArg), output = path.resolve(outputArg);
await mkdir(output, {recursive: false});
const files = new Map(), hashes = {};
const add = async (url, source, snapshot) => {
  const bytes = await readFile(source);
  hashes[url] = {source, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
  files.set(url, bytes);
  if (snapshot) {
    const dest = path.join(output, 'sources', snapshot);
    await mkdir(path.dirname(dest), {recursive: true});
    await writeFile(dest, bytes);
  }
};
for (const name of ['engine.js', 'scheduler.js', 'continuations.js', 'range-source.js'])
  await add('/runtime/' + name, path.join(root, 'web/private-mpv', name), 'runtime/' + name);
await add('/worker.mjs', path.join(import.meta.dirname, 'render-probe-worker.mjs'), 'render-probe-worker.mjs');
for (const name of ['probe.mjs', 'probe.wasm', 'probe.asyncify.wasm']) await add('/engine/' + name, path.join(build, name));
const server = http.createServer((req, res) => {
  if (req.url === '/') {res.setHeader('Content-Type', 'text/html');res.end('<!doctype html><title>Private RGB renderer prerequisite</title>');return;}
  const bytes = files.get(req.url);
  if (!bytes) {res.writeHead(404).end();return;}
  res.setHeader('Content-Type', req.url.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
  res.end(bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const result = {scope: 'Existing RGB renderer linked to private mpv: prerequisite only',
  startedAt: new Date().toISOString(), build, sourceSHA256: hashes, cases: [], headless: true,
  command: process.argv, mediaExecuted: false};
let browser;
try {
  browser = await chromium.launch({channel: 'chrome', headless: true});
  result.browser = browser.version();
  for (const backend of ['jspi', 'asyncify']) {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const test = await page.evaluate(backend => new Promise(resolve => {
      const worker = new Worker('/worker.mjs', {type: 'module'});
      const finish = data => {clearTimeout(timer);worker.terminate();resolve(data);};
      const timer = setTimeout(() => finish({passed: false, backend, error: 'Renderer lifecycle watchdog: 30 seconds'}), 30000);
      worker.onerror = e => finish({passed: false, backend, error: e.message});
      worker.onmessage = ({data}) => finish(data);
      worker.postMessage({backend});
    }), backend);
    result.cases.push(test);
    console.log(JSON.stringify({backend, passed: test.passed, cycles: test.cycles?.length, error: test.error}));
    await page.close();
    if (!test.passed) process.exitCode = 1;
  }
} catch (error) {
  result.error = String(error.stack ?? error);process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  result.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  await writeFile(path.join(output, 'build.json'), await readFile(path.join(build, 'build.json')));
}

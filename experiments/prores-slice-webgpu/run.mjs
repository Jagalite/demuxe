// SPDX-License-Identifier: Apache-2.0
// Run the isolated one-slice parity proof in headed or headless Chrome.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(here));
const build = join(root, 'build/experiments/prores-slice-webgpu');
const core = join(root, 'experiments/prores-idct-webgpu/idct-core.wgsl');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const iterations = Number(process.env.ITERATIONS || 150);
if (!Number.isInteger(iterations) || iterations < 1)
  throw Error('ITERATIONS must be a positive integer');
execFileSync('python3', [join(here, 'prepare.py')], {cwd: root, stdio: 'inherit'});
const caseBytes = await readFile(join(build, 'cases.json'));
const dataset = JSON.parse(await readFile(join(build, 'dataset.json'), 'utf8'));
if (sha256(caseBytes) !== dataset.casesSha256) throw Error('prepared case hash changed');
const cases = JSON.parse(caseBytes);
const files = new Map([
  ['/page.html', {path: join(here, 'page.html'), type: 'text/html'}],
  ['/gpu.js', {path: join(here, 'gpu.js'), type: 'text/javascript'}],
  ['/slice.wgsl', {path: join(here, 'slice.wgsl'), type: 'text/plain'}],
  ['/idct-core.wgsl', {path: core, type: 'text/plain'}],
]);
const server = http.createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  const entry = files.get(pathname);
  if (!entry) { res.writeHead(404).end('not found'); return; }
  try {
    res.setHeader('Content-Type', entry.type);
    res.setHeader('Cache-Control', 'no-store');
    res.end(await readFile(entry.path));
  } catch (error) { res.writeHead(500).end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const result = {date: new Date().toISOString(), ffmpeg: '9.0.2', dataset,
  coreSha256: sha256(await readFile(core)),
  sliceShaderSha256: sha256(await readFile(join(here, 'slice.wgsl'))),
  host: {platform: os.platform(), release: os.release(), arch: os.arch(),
    cpu: os.cpus()[0].model}, node: process.version,
  playwright: JSON.parse(await readFile(join(root, 'node_modules/playwright/package.json'), 'utf8')).version,
  pageErrors: [], consoleErrors: []};
let browser;
try {
  browser = await chromium.launch({channel: 'chrome', headless: process.env.HEADED !== '1'});
  result.browserVersion = browser.version();
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror', error => result.pageErrors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/page.html`);
  await page.waitForFunction(() => typeof window.runProof === 'function');
  result.gpu = await page.evaluate(([data, repeats]) => window.runProof(data, repeats),
    [cases, iterations]);
  result.passed = result.gpu.mismatches === 0 &&
    result.gpu.checkedSamples === dataset.visibleSamples &&
    result.gpu.cases.length === cases.length &&
    result.gpu.guardedSamples > 0 && !result.gpu.deviceLost &&
    result.gpu.validationErrors.length === 0 &&
    result.pageErrors.length === 0 && result.consoleErrors.length === 0;
  await page.close();
} catch (error) { result.passed = false; result.error = String(error?.stack || error); }
finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await writeFile(join(here, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({passed: result.passed, error: result.error,
    cases: result.gpu?.cases.length, checkedSamples: result.gpu?.checkedSamples,
    guardedSamples: result.gpu?.guardedSamples, timing: result.gpu?.timing}, null, 2));
  if (!result.passed) process.exitCode = 1;
}

// SPDX-License-Identifier: Apache-2.0
// Serve local prepared assets and run the isolated full-frame proof in Chrome.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {open, readFile, writeFile} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(here));
const build = join(root, 'build/experiments/prores-frame-webgpu');
const core = join(root, 'experiments/prores-idct-webgpu/idct-core.wgsl');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
execFileSync('python3', [join(here, 'prepare.py')], {cwd: root, stdio: 'inherit'});
const manifest = JSON.parse(await readFile(join(build, 'manifest.json'), 'utf8'));
const mainFrames = process.env.MAIN_FRAMES ?
  process.env.MAIN_FRAMES.split(',').map(Number) :
  Array.from({length: manifest.fixtures.main.frames}, (_, index) => index);
if (!mainFrames.length || new Set(mainFrames).size !== mainFrames.length ||
    mainFrames.some(index => !Number.isInteger(index) || index < 0 ||
      index >= manifest.fixtures.main.frames))
  throw Error('MAIN_FRAMES must be unique comma-separated frame indices');

const staticFiles = new Map([
  ['/page.html', {path: join(here, 'page.html'), type: 'text/html'}],
  ['/gpu.js', {path: join(here, 'gpu.js'), type: 'text/javascript'}],
  ['/frame.wgsl', {path: join(here, 'frame.wgsl'), type: 'text/plain'}],
  ['/idct-core.wgsl', {path: core, type: 'text/plain'}],
]);
const server = http.createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  try {
    const entry = staticFiles.get(pathname);
    if (entry) {
      res.setHeader('Content-Type', entry.type);
      res.end(await readFile(entry.path));
      return;
    }
    const data = /^\/data\/(main|partial)\/(\d{3})\.(json|bin)$/.exec(pathname);
    if (data) {
      const [, fixture, digits, extension] = data;
      const index = Number(digits);
      if (index >= manifest.fixtures[fixture].frames) {
        res.writeHead(404).end('frame out of range'); return;
      }
      res.setHeader('Content-Type', extension === 'json' ?
        'application/json' : 'application/octet-stream');
      res.end(await readFile(join(build, fixture, `frame-${digits}.${extension}`)));
      return;
    }
    const oracle = /^\/oracle\/(main|partial)\/(\d{3})$/.exec(pathname);
    if (oracle) {
      const [, fixture, digits] = oracle;
      const index = Number(digits);
      const info = manifest.fixtures[fixture];
      if (index >= info.frames) {
        res.writeHead(404).end('frame out of range'); return;
      }
      const frameBytes = info.width * info.height * 4;
      const source = fixture === 'main' ?
        join(root, 'build/experiments/prores-idct-webgpu/frames.yuv') :
        join(build, 'partial/frames.yuv');
      const file = await open(source, 'r');
      const bytes = Buffer.allocUnsafe(frameBytes);
      try {
        let offset = 0;
        while (offset < frameBytes) {
          const {bytesRead} = await file.read(bytes, offset, frameBytes - offset,
            index * frameBytes + offset);
          if (!bytesRead) throw Error('oracle truncated');
          offset += bytesRead;
        }
      } finally { await file.close(); }
      res.setHeader('Content-Type', 'application/octet-stream');
      res.end(bytes);
      return;
    }
    res.writeHead(404).end('not found');
  } catch (error) { res.writeHead(500).end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const result = {date: new Date().toISOString(), manifest,
  coreSha256: hash(await readFile(core)),
  frameShaderSha256: hash(await readFile(join(here, 'frame.wgsl'))),
  browserHost: {platform: os.platform(), release: os.release(),
    arch: os.arch(), cpu: os.cpus()[0].model},
  node: process.version,
  playwright: JSON.parse(await readFile(join(root, 'node_modules/playwright/package.json'), 'utf8')).version,
  selectedMainFrames: mainFrames, pageErrors: [], consoleErrors: []};
let browser;
try {
  browser = await chromium.launch({channel: 'chrome', headless: process.env.HEADED !== '1'});
  result.browserVersion = browser.version();
  const page = await browser.newPage();
  page.setDefaultTimeout(600000);
  page.on('pageerror', error => result.pageErrors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/page.html`);
  await page.waitForFunction(() => typeof window.runProof === 'function');
  result.gpu = await page.evaluate(([data, frames]) => window.runProof(data, frames),
    [manifest, mainFrames]);
  const expectedSamples = (mainFrames.length * 640 * 360 + 642 * 360) * 2;
  result.passed = result.gpu.mismatches === 0 &&
    result.gpu.samplesChecked === expectedSamples &&
    result.gpu.frames.length === mainFrames.length + 1 &&
    result.gpu.genuinePartialWidthSlices === 23 &&
    result.gpu.frames.every(frame => frame.dispatches === 1 && frame.mismatches === 0) &&
    !result.gpu.deviceLost && result.gpu.validationErrors.length === 0 &&
    result.pageErrors.length === 0 && result.consoleErrors.length === 0;
  await page.close();
} catch (error) { result.passed = false; result.error = String(error?.stack || error); }
finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await writeFile(join(here, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({passed: result.passed, error: result.error,
    frames: result.gpu?.frames.length, samplesChecked: result.gpu?.samplesChecked,
    genuinePartialWidthSlices: result.gpu?.genuinePartialWidthSlices,
    peakExplicitPoolBytes: result.gpu?.sizes.peakExplicitPoolBytes,
    timing: result.gpu?.timing}, null, 2));
  if (!result.passed) process.exitCode = 1;
}

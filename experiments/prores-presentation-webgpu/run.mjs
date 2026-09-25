// SPDX-License-Identifier: Apache-2.0
// Serve prepared assets and run the worker-owned decode-to-canvas proof.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import {dirname, extname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(here));
const build = join(root, 'build/experiments/prores-presentation-webgpu');
const frameBuild = join(root, 'build/experiments/prores-frame-webgpu');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
execFileSync('python3', [join(here, 'prepare.py')], {cwd: root, stdio: 'inherit'});
const manifest = JSON.parse(await readFile(join(build, 'manifest.json'), 'utf8'));
const allowedReferences = new Set(manifest.cases.map(item => item.referenceFile));
const server = http.createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') {res.writeHead(204).end(); return;}
  try {
    const local = pathname === '/' ? join(here, 'page.html') :
      pathname === '/idct-core.wgsl' ? join(root, 'experiments/prores-idct-webgpu/idct-core.wgsl') :
      pathname === '/frame.wgsl' ? join(root, 'experiments/prores-frame-webgpu/frame.wgsl') :
      pathname.startsWith('/web/') || pathname.startsWith('/experiments/prores-') ?
        resolve(root, '.' + pathname) : null;
    if (local && (local === join(here, 'page.html') ||
        local.startsWith(join(root, 'web') + sep) ||
        local.startsWith(join(root, 'experiments/prores-') ))) {
      const type = extname(local) === '.js' || extname(local) === '.mjs' ?
        'text/javascript' : extname(local) === '.html' ? 'text/html' : 'text/plain';
      res.setHeader('Content-Type', type);
      res.end(await readFile(local));
      return;
    }
    const data = /^\/data\/(main|partial)\/(\d{3})\.(json|bin)$/.exec(pathname);
    if (data) {
      const [, fixture, digits, extension] = data;
      if (Number(digits) >= manifest.frames[fixture].frames) {
        res.writeHead(404).end('frame out of range'); return;
      }
      res.setHeader('Content-Type', extension === 'json' ?
        'application/json' : 'application/octet-stream');
      res.end(await readFile(join(frameBuild, fixture, `frame-${digits}.${extension}`)));
      return;
    }
    const reference = /^\/reference\/([a-z0-9-]+\.rgba)$/.exec(pathname);
    if (reference && allowedReferences.has(reference[1])) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.end(await readFile(join(build, reference[1])));
      return;
    }
    res.writeHead(404).end('not found');
  } catch (error) {res.writeHead(500).end(String(error));}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const result = {date: new Date().toISOString(), ffmpeg: '9.0.2',
  fixtureHashes: Object.fromEntries(Object.entries(manifest.frames).map(([key, info]) =>
    [key, info.fixtureSha256])),
  sourceHashes: {
    decodeShader: hash(await readFile(join(root, 'experiments/prores-frame-webgpu/frame.wgsl'))),
    idct: hash(await readFile(join(root, 'experiments/prores-idct-webgpu/idct-core.wgsl'))),
    presenter: hash(await readFile(join(root, 'web/webgpu/presenter.js'))),
    worker: hash(await readFile(join(here, 'worker.js'))),
    referenceBinary: manifest.rgbReferenceBinarySha256,
  },
  references: manifest.cases.map(item => ({id: item.id, sha256: item.referenceSha256})),
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
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => typeof window.runProof === 'function');
  result.gpu = await page.evaluate(data => window.runProof(data), manifest);
  result.passed = result.gpu.comparisons.length === 7 &&
    result.gpu.comparisons.every(item => item.alphaErrors === 0 &&
      item.meanAbs <= 1 && item.p99Abs <= 3 && item.maxAbs <= 4) &&
    result.gpu.gpuPixelReadbacksInPresentation === 0 &&
    result.gpu.gpuToGpuPresentationCopies === 0 &&
    result.gpu.perFrameCompletionWaits === 0 &&
    result.gpu.batchCompletionWaits === 1 &&
    result.gpu.sameWorkerDevice &&
    result.gpu.surfacePoolBeforeCompletion.allocatedSurfaces === 2 &&
    result.gpu.surfacePoolBeforeCompletion.reuses === 2 &&
    result.gpu.surfacePoolAfterRelease.freeSurfaces === 2 &&
    result.gpu.runtimeBeforeCleanup.liveBufferBytes -
      result.gpu.runtimeAfterPoolDestroy.liveBufferBytes ===
      result.gpu.pooledSurfaceBytes &&
    result.gpu.boundRejected && result.gpu.staleRejected &&
    !result.gpu.deviceLost && result.gpu.validationErrors.length === 0 &&
    result.pageErrors.length === 0 && result.consoleErrors.length === 0;
  await page.close();
} catch (error) {result.passed = false; result.error = String(error?.stack ?? error);}
finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await writeFile(join(here, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({passed: result.passed, error: result.error,
    comparisons: result.gpu?.comparisons,
    combinedGpuCompletionWallMs: result.gpu?.combinedGpuCompletionWallMs,
    decodePresentationBatchWallMs: result.gpu?.decodePresentationBatchWallMs,
    pool: result.gpu?.surfacePoolBeforeCompletion}, null, 2));
  if (!result.passed) process.exitCode = 1;
}

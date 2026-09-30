// SPDX-License-Identifier: MIT
// Contemporary maintained RGB Software baseline; no CPU measurements.
import http from 'node:http';
import path from 'node:path';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const [assetsArg, referencesArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw Error('Usage: node run-isolated-baseline.mjs ENGINE_ASSET_ROOT REFERENCES FRESH_OUTPUT');
const root = path.resolve(import.meta.dirname, '../../../..'), assets = path.resolve(assetsArg), references = path.resolve(referencesArg), output = path.resolve(outputArg);
await mkdir(output, {recursive: false});await mkdir(path.join(output, 'sources'));
await writeFile(path.join(output, 'sources/run-isolated-baseline.mjs'), await readFile(import.meta.filename));
const rows = JSON.parse(await readFile(path.join(references, 'references.json'))).rows;
const files = new Map(), hashes = {}, report = {scope: 'Contemporary isolated RGB Software picture/control/lifecycle baseline; PCM oracle remains separate', startedAt: new Date().toISOString(), cases: [], sourceSHA256: hashes};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const server = http.createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  try {
    if (req.url === '/') {res.setHeader('Content-Type', 'text/html');res.end('<!doctype html><canvas width="320" height="180"></canvas>');return;}
    const url = new URL(req.url, 'http://localhost');
    let file;
    if (url.pathname.startsWith('/fixture/')) file = rows.find(row => row.profile.key === url.pathname.slice(9))?.profile.fixture;
    else {
      const relative = url.pathname.replace(/^\//, '');
      if (!relative.startsWith('web/') && !relative.startsWith('fixtures/')) throw Error('Unknown asset');
      const base = relative.startsWith('web/engine-') || relative.startsWith('fixtures/') ? assets : root;
      file = path.resolve(base, relative);
      if (!file.startsWith(base + path.sep)) throw Error('Invalid asset path');
    }
    if (!file) {res.writeHead(404).end();return;}
    if (!files.has(file)) {
      const bytes = await readFile(file);files.set(file, bytes);hashes[file] = {sha256: hash(bytes), bytes: bytes.length};
      if (file.startsWith(root + '/web/') && /\.m?js$/.test(file)) {
        const target = path.join(output, 'sources', file.slice(root.length + 1));await mkdir(path.dirname(target), {recursive: true});await writeFile(target, bytes);
      }
    }
    res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : /\.m?js$/.test(file) ? 'text/javascript' : 'application/octet-stream');
    res.end(files.get(file));
  } catch (error) {res.writeHead(404).end(String(error));}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const save = () => writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
try {
  for (const {profile} of rows) {
    const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required']});
    const row = {key: profile.key, browser: browser.version(), captures: [], passed: false};report.cases.push(row);
    const page = await browser.newPage();page.setDefaultTimeout(30000);
    try {
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.evaluate(async profile => {
        const {WasmPlayer} = await import('/web/generated/internal/wasm-player.js');
        window.baseline = new WasmPlayer(document.querySelector('canvas'), {mode: 'software', softwarePresenter: 'rgb', assetBase: new URL('/', location.href), disableBrowserCodecs: true});
        window.failures = [];baseline.addEventListener('error', e => failures.push(String(e.detail)));
        await baseline.ready;
        await baseline.open(new File([await (await fetch('/fixture/' + profile.key)).blob()], profile.key));
      }, profile);
      const ref = await readFile(path.join(references, profile.key, 'reference.rgb'));
      for (const target of [0.5, 1.5, 2.5]) {
        const before = await page.evaluate(() => baseline.diagnostics?.rendered ?? 0);
        await page.evaluate(target => baseline.seek(target), target);
        await page.waitForFunction(({target, before}) => baseline.diagnostics?.rendered > before && !baseline.diagnostics.seeking && Math.abs(baseline.diagnostics.presentedPosition - target) < 0.15, {target, before});
        const rgba = await page.evaluate(async () => {
          const source = document.querySelector('canvas'), image = await createImageBitmap(await (await fetch(source.toDataURL())).blob());
          const canvas = document.createElement('canvas');canvas.width = source.width;canvas.height = source.height;
          const context = canvas.getContext('2d');context.drawImage(image, 0, 0);image.close();return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
        });
        const rgb = Buffer.alloc(profile.width * profile.height * 3);
        for (let i = 0; i < rgb.length; i++) rgb[i] = rgba[Math.floor(i / 3) * 4 + i % 3];
        const name = profile.key + '-seek-' + target + '.rgb';await writeFile(path.join(output, name), rgb);
        let best = {mae: Infinity};
        for (let frame = Math.max(0, Math.floor((target - 1) * profile.fps)); frame <= Math.ceil((target + 1) * profile.fps); frame++) {
          let sum = 0;for (let i = 0; i < rgb.length; i++) sum += Math.abs(rgb[i] - ref[frame * rgb.length + i]);
          const mae = sum / rgb.length;if (mae < best.mae) best = {mae, frame, time: frame / profile.fps};
        }
        row.captures.push({target, picture: name, reference: best});
        if (!(best.mae < 5 && Math.abs(best.time - target) <= 1 / profile.fps + 0.001)) throw Error('Baseline seek picture mismatch: ' + JSON.stringify(best));
      }
      await page.evaluate(async () => {await baseline.seek(0);await baseline.play();});
      await page.waitForFunction(() => baseline.properties.get('time-pos') > 1);
      row.evidence = await page.evaluate(() => ({isolated: crossOriginIsolated, diagnostics: baseline.diagnostics, audio: baseline.audioDiagnostics(), properties: Object.fromEntries(baseline.properties), failures}));
      if (!row.evidence.isolated || row.evidence.failures.length || row.evidence.diagnostics.decoder !== 'software') throw Error('Unexpected baseline path/failure');
      await page.evaluate(() => baseline.destroy());
      await page.waitForFunction(() => document.querySelectorAll('iframe').length === 0);
      for (let i = 0; i < 30 && page.workers().length; i++) await page.waitForTimeout(50);
      row.cleanup = {workers: page.workers().length, context: await page.evaluate(() => baseline.audioDiagnostics().state)};
      if (row.cleanup.workers || row.cleanup.context !== 'closed') throw Error('Baseline cleanup failed');
      row.passed = true;
    } catch (error) {row.error = String(error.stack ?? error);await page.evaluate(() => baseline?.destroy()).catch(() => {});}
    finally {await browser.close();await save();console.log(JSON.stringify({key: row.key, passed: row.passed, error: row.error}));}
  }
} finally {server.closeAllConnections();await new Promise(resolve => server.close(resolve));report.finishedAt = new Date().toISOString();report.passed = report.cases.length === 6 && report.cases.every(c => c.passed);await save();}
process.exit(report.passed ? 0 : 1);

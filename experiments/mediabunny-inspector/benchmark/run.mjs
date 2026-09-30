// Run: node experiments/mediabunny-inspector/benchmark/run.mjs
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat, writeFile, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const fixtureRoot = '/tmp/demuxe-mediabunny-fixtures';
const cases = [
  ['simple MP4 H264 AAC', 'fixtures/example.mp4'],
  ['MP4 HEVC AAC', 'build/hybrid-cpu-attribution/assets-paired-simple-draw-20260923/fixtures/hevc-hvc1/index.mp4'],
  ['MP4 H264 MP3', 'build/hybrid-cpu-attribution/assets-paired-simple-draw-20260923/fixtures/h264-mp3/index.mp4'],
  ['MP4 H264 MOV text', 'build/hybrid-cpu-attribution/assets-paired-simple-draw-20260923/fixtures/h264-movtext/index.mp4'],
  ['MKV H264 AAC', `${fixtureRoot}/h264-aac.mkv`],
  ['MKV HEVC AAC', `${fixtureRoot}/hevc-aac.mkv`],
  ['MKV AV1 Opus', `${fixtureRoot}/av1-opus.mkv`],
  ['WebM VP9 Opus', `${fixtureRoot}/vp9-opus.webm`],
  ['MOV H264 PCM', `${fixtureRoot}/h264-pcm.mov`],
  ['MPEG-TS H264 AAC', `${fixtureRoot}/h264-aac.ts`],
  ['MKV H264 AC3', `${fixtureRoot}/h264-ac3.mkv`],
  ['MKV ASS and font', 'fixtures/m0.mkv'],
  ['MKV SRT', 'build/hybrid-cpu-attribution/assets-paired-simple-draw-20260923/fixtures/h264-srt/index.mkv'],
];
const requests = [];
const server = http.createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  const target = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!target.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  try {
    const info = await stat(target); if (!info.isFile()) throw Error('not file');
    const mime = target.endsWith('.js') || target.endsWith('.mjs') ? 'text/javascript' : target.endsWith('.html') ? 'text/html' : target.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream';
    requests.push({path: path.relative(root, target), bytes: info.size, mime});
    res.setHeader('Content-Type', mime); res.setHeader('Content-Length', info.size);
    res.writeHead(200); createReadStream(target).pipe(res);
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--autoplay-policy=no-user-gesture-required']});
const output = {schema: 1, date: new Date().toISOString(), head: 'f2e35538caf98e9e6e2efbbe1766e9b0fae1c8ea', browser: browser.version(), cases: []};
try {
  for (const [label, fixture] of cases) {
    const absolute = path.isAbsolute(fixture) ? fixture : path.join(root, fixture);
    try {await stat(absolute);} catch {output.cases.push({label, fixture, missing: true}); continue;}
    const record = {label, fixture, methods: {}};
    for (const method of ['cheap', 'ffmpeg', 'mediabunny']) {
      const context = await browser.newContext(); const page = await context.newPage();
      const before = requests.length;
      try {
        await page.goto(`${base}/experiments/mediabunny-inspector/benchmark/page.html`);
        await page.locator('#media').setInputFiles(absolute);
        const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
        const beforeMetrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
        const result = await page.evaluate(method => globalThis.benchInspector(method), method);
        const afterMetrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
        const assets = requests.slice(before);
        let admission;
        try { admission = await page.evaluate(probe => globalThis.planFromProbe(probe), result.probe); }
        catch (error) { admission = {error: String(error)}; }
        record.methods[method] = {result, admission, assets,
          taskMs: 1000 * ((afterMetrics.TaskDuration ?? 0) - (beforeMetrics.TaskDuration ?? 0)),
          heapBefore: beforeMetrics.JSHeapUsedSize ?? null, heapAfter: afterMetrics.JSHeapUsedSize ?? null};
      } catch (error) {record.methods[method] = {error: String(error), assets: requests.slice(before)};}
      finally {await context.close();}
    }
    output.cases.push(record);
    process.stdout.write(`${label}: ${Object.entries(record.methods).map(([name, x]) => `${name}=${x.result?.wallMs?.toFixed(0) ?? 'ERR'}ms`).join(' ')}\n`);
  }
  output.playback = [];
  const shim = await readFile(path.join(here, 'source-probe-shim.mjs'), 'utf8');
  for (const label of ['MP4 HEVC AAC', 'MP4 H264 MP3', 'MKV H264 AAC', 'MKV HEVC AAC', 'MKV AV1 Opus', 'WebM VP9 Opus', 'MKV H264 AC3']) {
    const item = output.cases.find(x => x.label === label);
    if (!item?.methods.mediabunny.result?.details?.complete) continue;
    const absolute = path.isAbsolute(item.fixture) ? item.fixture : path.join(root, item.fixture);
    for (let repetition = 0; repetition < 3; repetition++) for (const arm of repetition % 2 ? ['mediabunny', 'current'] : ['current', 'mediabunny']) {
      const context = await browser.newContext(); const page = await context.newPage();
      if (arm === 'mediabunny') await page.route('**/web/source-probe.js', route => route.fulfill({status: 200, contentType: 'text/javascript', body: shim}));
      const before = requests.length;
      try {
        await page.goto(`${base}/experiments/mediabunny-inspector/benchmark/page.html`);
        await page.locator('#media').setInputFiles(absolute);
        const result = await page.evaluate(() => globalThis.playExistingRoute());
        output.playback.push({label, arm, repetition, result, assets: requests.slice(before)});
        process.stdout.write(`play ${label} ${arm} #${repetition}: ${result.selected} ${result.firstPresentedMs?.toFixed(0) ?? '-'}ms ${result.error ? 'ERROR' : ''}\n`);
      } catch (error) {output.playback.push({label, arm, repetition, error: String(error), assets: requests.slice(before)});}
      finally {await context.close();}
    }
  }
} finally {await browser.close(); await new Promise(resolve => server.close(resolve));}
await writeFile(path.join(here, '../notes/cold-probe.json'), JSON.stringify(output, null, 2) + '\n');

// SPDX-License-Identifier: Apache-2.0
// Usage: node experiments/fast-inspector/benchmark/run.mjs
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const baseFixture = 'build/hybrid-cpu-attribution/assets-paired-simple-draw-20260923/fixtures';
const cases = [
  ['MP4 H264 AAC', 'fixtures/example.mp4'],
  ['MP4 HEVC AAC', `${baseFixture}/hevc-hvc1/index.mp4`],
  ['MP4 AV1 AAC', `${baseFixture}/av1-aac/index.mp4`],
  ['MP4 H264 MP3', `${baseFixture}/h264-mp3/index.mp4`],
  ['MP4 MOV text', `${baseFixture}/h264-movtext/index.mp4`],
  ['MP4 fragmented', `${baseFixture}/h264-fmp4/index.mp4`],
  ['MOV H264 PCM', '/tmp/demuxe-mediabunny-fixtures/h264-pcm.mov'],
  ['MOV ProRes PCM', 'build/fixtures/software-full/prores-pcm.mov'],
  ['MKV H264 AAC', '/tmp/demuxe-mediabunny-fixtures/h264-aac.mkv'],
  ['MKV HEVC AAC', '/tmp/demuxe-mediabunny-fixtures/hevc-aac.mkv'],
  ['MKV AV1 Opus', '/tmp/demuxe-mediabunny-fixtures/av1-opus.mkv'],
  ['MKV H264 AC3', `${baseFixture}/h264-ac3/index.mkv`],
  ['MKV HEVC EAC3', '/tmp/demuxe-mediabunny-fixtures/hevc-eac3.mkv'],
  ['MKV H264 DTS', `${baseFixture}/h264-dts/index.mkv`],
  ['MKV ASS font', 'fixtures/m0.mkv'],
  ['MKV H264 AAC ASS', `${baseFixture}/h264-ass/index.mkv`],
  ['MKV H264 AC3 ASS', '/tmp/demuxe-fast-inspector-fixtures/h264-ac3-ass.mkv'],
  ['MKV SRT', `${baseFixture}/h264-srt/index.mkv`],
  ['MKV PGS', `${baseFixture}/h264-aac-pgs-isolation/index.mkv`],
  ['MKV HEVC AC3 PGS', `${baseFixture}/hevc-pgs/index.mkv`],
  ['MKV H264 AC3 VobSub', `${baseFixture}/h264-vobsub/index.mkv`],
  ['WebM VP9 Opus', '/tmp/demuxe-mediabunny-fixtures/vp9-opus.webm'],
  ['WebM VP8 Vorbis', 'build/fixtures/software-full/vp8-vorbis.webm'],
  ['WAV PCM16', 'build/fixtures/software-full/control.wav'],
  ['WAV PCM24', `${baseFixture}/audio-pcm24/index.wav`],
  ['FLAC audio', 'build/fixtures/software-full/audio.flac'],
  ['MP3 audio', 'build/fixtures/software-full/audio.mp3'],
  ['Ogg Opus', `${baseFixture}/audio-opus/index.ogg`],
  ['Ogg Vorbis', `${baseFixture}/audio-vorbis/index.ogg`],
  ['ADTS AAC', '/tmp/demuxe-mediabunny-fixtures/aac-only.adts'],
  ['MPEG-TS H264 AAC', '/tmp/demuxe-mediabunny-fixtures/h264-aac.ts'],
];
const option = name => process.argv.find(x => x.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const labels = option('labels')?.split(',');
const selectedCases = labels ? cases.filter(([label]) => labels.includes(label)) : cases;
const methods = option('methods')?.split(',') ?? ['fast', 'mediabunny', 'ffmpeg'];
const repeats = Math.max(1, Math.min(10, Number(option('repeats') ?? 1)));
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
    requests.push({path: path.relative(root, target), method: req.method, bytes: req.method === 'HEAD' ? 0 : info.size});
    res.setHeader('Content-Type', mime); res.setHeader('Content-Length', info.size);
    res.writeHead(200); if (req.method === 'HEAD') res.end(); else createReadStream(target).pipe(res);
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--autoplay-policy=no-user-gesture-required']});
const output = {schema: 1, date: new Date().toISOString(), head: 'f2e35538caf98e9e6e2efbbe1766e9b0fae1c8ea', browser: browser.version(), cases: []};
try {
  for (const [label, fixture] of selectedCases) for (let repetition = 0; repetition < repeats; repetition++) {
    const absolute = path.isAbsolute(fixture) ? fixture : path.join(root, fixture);
    try {await stat(absolute);} catch {output.cases.push({label, fixture, missing: true}); continue;}
    const row = {label, fixture, repetition, methods: {}};
    for (const method of repetition % 2 ? [...methods].reverse() : methods) {
      const context = await browser.newContext(); const page = await context.newPage();
      const before = requests.length;
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/experiments/fast-inspector/benchmark/page.html`);
        await page.locator('#media').setInputFiles(absolute);
        const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
        const prior = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
        const cold = await page.evaluate(method => globalThis.benchInspector(method), method);
        const later = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
        const assets = requests.slice(before);
        const admissionStart = Date.now();
        const admission = await page.evaluate(probe => globalThis.planFromProbe(probe), cold.probe).catch(error => ({error: String(error)}));
        const admissionMs = Date.now() - admissionStart;
        const warm = await page.evaluate(method => globalThis.benchInspector(method), method).catch(error => ({error: String(error)}));
        row.methods[method] = {cold, warmMs: warm.wallMs, admission, admissionMs, assets,
          taskMs: 1000 * ((later.TaskDuration ?? 0) - (prior.TaskDuration ?? 0)),
          heapDelta: (later.JSHeapUsedSize ?? 0) - (prior.JSHeapUsedSize ?? 0)};
      } catch (error) {row.methods[method] = {error: String(error), assets: requests.slice(before)};}
      finally {await context.close();}
    }
    output.cases.push(row);
    console.log(label, Object.entries(row.methods).map(([m, x]) => `${m}:${x.cold?.wallMs?.toFixed(0) ?? 'ERR'}ms/${x.cold?.details?.status ?? x.cold?.details?.complete ?? '-'}`).join(' '));
  }
} finally {await browser.close(); await new Promise(resolve => server.close(resolve));}
await writeFile(path.resolve(option('out') ?? path.join(here, '../result.json')), JSON.stringify(output, null, 2) + '\n');

// SPDX-License-Identifier: Apache-2.0
// Existing Player and playback routes, with an experiment-only inspector swap.
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
let cases = [
  ['MP4 HEVC AAC', 'build/hybrid-cpu-attribution/assets-paired-simple-draw-20260923/fixtures/hevc-hvc1/index.mp4'],
  ['MKV H264 AAC', '/tmp/demuxe-mediabunny-fixtures/h264-aac.mkv'],
  ['WebM VP9 Opus', '/tmp/demuxe-mediabunny-fixtures/vp9-opus.webm'],
];
const all = process.argv.includes('--all');
const option = name => process.argv.find(x => x.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
if (all) {
  const screen = JSON.parse(await readFile(path.join(here, '../result.json'), 'utf8'));
  cases = screen.cases.filter(c => c.methods?.fast?.cold?.details?.status === 'qualified').map(c => [c.label, c.fixture]);
}
if (option('labels')) {
  const requested = new Set(option('labels').split(','));
  const screen = JSON.parse(await readFile(path.join(here, '../notes/subtitle-parity-final.json'), 'utf8'));
  cases = [...new Map(screen.cases.filter(c => requested.has(c.label) && c.methods?.fast?.cold?.details?.status === 'qualified')
    .map(c => [c.label, c.fixture])).entries()];
}
if (option('matrix-labels')) {
  const requested=new Set(option('matrix-labels').split(','));
  const screen=JSON.parse(await readFile(path.join(here,'../result.json'),'utf8'));
  cases=screen.cases.filter(c=>requested.has(c.label)).map(c=>[c.label,c.fixture]);
}
const openOnly=all||process.argv.includes('--open-only');
const requests = [];
const server = http.createServer(async (req, res) => {
  if(!process.argv.includes('--no-isolation')){
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  const target = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!target.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  try {
    const info = await stat(target); if (!info.isFile()) throw Error('not file');
    requests.push({path: path.relative(root, target), method: req.method, bytes: req.method === 'HEAD' ? 0 : info.size});
    res.setHeader('Content-Type', target.endsWith('.js') || target.endsWith('.mjs') ? 'text/javascript' : target.endsWith('.html') ? 'text/html' : target.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
    res.setHeader('Content-Length', info.size); res.writeHead(200);
    if (req.method === 'HEAD') res.end(); else createReadStream(target).pipe(res);
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--autoplay-policy=no-user-gesture-required']});
const shim = await readFile(path.join(here, 'source-probe-shim.mjs'), 'utf8');
const output = {schema: 1, date: new Date().toISOString(), browser: browser.version(), rows: []};
try {
  for (const [label, fixture] of cases) for (let repetition = 0; repetition < Number(option('repeats') ?? (all ? 1 : 3)); repetition++)
    for (const arm of option('arms')?.split(',') ?? (repetition % 2 ? ['fast', 'current'] : ['current', 'fast'])) {
      const context = await browser.newContext(), page = await context.newPage();
      if (arm === 'fast') await page.route('**/web/source-probe.js', route => route.fulfill({status: 200, contentType: 'text/javascript', body: shim}));
      const before = requests.length;
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/experiments/fast-inspector/benchmark/page.html`);
        await page.locator('#media').setInputFiles(path.isAbsolute(fixture) ? fixture : path.join(root, fixture));
        const result = await page.evaluate(process.argv.includes('--resume-after-direct') ? () => globalThis.openThenInspectBeyondDirect() : process.argv.includes('--force-direct-failure') ? () => globalThis.openWithForcedDirectFailure() : process.argv.includes('--reject-fast-direct-admission') ? () => globalThis.openWithFastDirectAdmissionRejected() : openOnly ? () => globalThis.openExistingRoute() : () => globalThis.playExistingRoute());
        output.rows.push({label, fixture, repetition, arm, result, assets: requests.slice(before)});
        console.log(label, repetition, arm, result.selected, (result.firstPresentedMs ?? result.openMs)?.toFixed(1), result.error ? 'ERROR' : '');
      } catch (error) {output.rows.push({label, fixture, repetition, arm, error: String(error), assets: requests.slice(before)});}
      finally {await context.close();}
    }
} finally {await browser.close(); await new Promise(resolve => server.close(resolve));}
await writeFile(path.resolve(option('out') ?? path.join(here, all ? '../notes/route-startup.json' : '../notes/playback.json')), JSON.stringify(output, null, 2) + '\n');

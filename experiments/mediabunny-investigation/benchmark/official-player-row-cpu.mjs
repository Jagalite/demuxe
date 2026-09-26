// SPDX-License-Identifier: Apache-2.0
// Experimental single-Chrome row comparison. Never writes production routing.
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchBenchmarkChrome, collectCpuWindow, summarizeCpu, delay, benchmarkPolicy } from '../../../tests/head-to-head/benchmark-browser.mjs';
import { serve } from '../../../tests/head-to-head/server.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const assets = path.join(root, 'build/head-to-head/assets-release-auto-fix-20260925-03');
const fixture = process.argv.find(arg => arg.startsWith('--fixture='))?.slice(10);
const output = process.argv.find(arg => arg.startsWith('--out='))?.slice(6);
const pilot = process.argv.includes('--pilot');
const rounds = pilot ? 1 : 3;
const seconds = pilot ? 5 : 20;
if (!fixture || !output) throw Error('Specify --fixture and --out');
const cases = JSON.parse(await readFile(path.join(assets, 'fixtures/catalogue.json')));
const source = cases[fixture];
if (!source || source.live || source.streamFormat) throw Error('Unknown or unsupported fixture');
const directory = path.resolve(output);
await mkdir(directory, { recursive: false });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const players = ['video', 'demuxe-auto', 'demuxe-software', 'movi', 'libmedia', 'mediabunny'];
const result = { date: new Date().toISOString(), scope: 'One headed Chrome launch per row; fresh context per arm; rotating order; local URL for maintained players and local File for published MediaBunny example',
  fixture, source, fixtureSha256: sha256(await readFile(path.join(assets, 'fixtures', source.file))),
  assetManifestSha256: sha256(await readFile(path.join(assets, 'manifest.json'))), policy: benchmarkPolicy,
  players, rounds, pilot, warmupSeconds: pilot ? 1 : 5, windowSeconds: seconds, idles: [], arms: [] };
const save = () => writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n');
await save();
const server = await serve(assets, path.join(root, 'tests/head-to-head'), path.join(directory, 'requests.jsonl'));
let browser, cdp;
try {
  const launched = await launchBenchmarkChrome({ headless: false, channel: 'chrome', startupGate: !pilot });
  browser = launched.browser; result.browserLaunch = launched.identity;
  cdp = await browser.newBrowserCDPSession();
  const idle = async round => {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto('about:blank'); await page.bringToFront();
    const samples = await collectCpuWindow(cdp, () => page.evaluate(() => ({ visible: document.visibilityState === 'visible', focused: document.hasFocus() })), { seconds, interval: 2 });
    result.idles.push({ round, summary: summarizeCpu(samples), samples });
    await context.close(); await save();
  };
  for (let round = 1; round <= rounds; round++) {
    if (!pilot) await idle(round);
    const order = players.map((_, index) => players[(index + round - 1) % players.length]);
    for (const player of order) {
      const entry = { round, player, status: 'running' };
      result.arms.push(entry); await save();
      const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.on('pageerror', error => (entry.pageErrors ??= []).push(error.message));
      try {
        if (player === 'mediabunny') {
          await page.addInitScript(() => {
            window.__rowProbe = { draws: 0, audioStarts: 0 };
            const draw = CanvasRenderingContext2D.prototype.drawImage;
            CanvasRenderingContext2D.prototype.drawImage = function (...args) {
              if (this.canvas.closest?.('#player')) window.__rowProbe.draws++;
              return draw.apply(this, args);
            };
            const start = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function (...args) { window.__rowProbe.audioStarts++; return start.apply(this, args); };
          });
          await page.goto('https://mediabunny.dev/examples/media-player/', { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (!result.mediaBunnyAsset) {
            const script = await page.locator('script[src*="media-player"]').getAttribute('src');
            const response = await page.request.get(new URL(script, page.url()).href);
            result.mediaBunnyAsset = { url: response.url(), sha256: sha256(await response.body()) };
          }
          const chooser = page.waitForEvent('filechooser');
          await page.locator('#select-file').click();
          await (await chooser).setFiles(path.join(assets, 'fixtures', source.file));
          await page.locator('#player').waitFor({ state: 'visible', timeout: 30000 });
          await page.locator('#play-button').evaluate(el => el.click());
        } else {
          const [kind, lane] = player.startsWith('demuxe-') ? ['demuxe', player.slice(7)] : [player, 'default'];
          await page.goto(`${server.origin}/harness/harness.html`, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => Boolean(window.api));
          await page.evaluate(config => api.start(config), { ...source, id: `${kind}.${lane}.${fixture}`, fixture, player: kind, lane, correctness: false });
        }
        await page.bringToFront();
        const snapshot = () => page.evaluate(kind => {
          if (kind === 'mediabunny') {
            const clock = document.querySelector('#current-time')?.textContent ?? '0:0';
            const [m, s] = clock.split(':').map(Number);
            return { position: m * 60 + s, frames: window.__rowProbe.draws, audioStarts: window.__rowProbe.audioStarts,
              visible: document.visibilityState === 'visible', focused: document.hasFocus(),
              errors: [document.querySelector('#error-element')?.textContent, document.querySelector('#warning-element')?.textContent].filter(Boolean) };
          }
          const state = api.snapshot();
          return { ...state, frames: state.video?.total == null ? null : state.video.total - state.video.dropped };
        }, player);
        await page.waitForFunction(kind => {
          if (kind === 'mediabunny') return window.__rowProbe.draws > 5 && window.__rowProbe.audioStarts > 5;
          return api.snapshot().position > 0.5;
        }, player, { timeout: 20000 });
        await delay(pilot ? 1000 : 5000);
        entry.before = await snapshot();
        entry.samples = await collectCpuWindow(cdp, snapshot, { seconds, interval: 2 });
        entry.after = await snapshot();
        entry.cpu = summarizeCpu(entry.samples);
        const advance = entry.after.position - entry.before.position;
        const frames = entry.before.frames == null || entry.after.frames == null ? null : entry.after.frames - entry.before.frames;
        const audioStarts = player === 'mediabunny' ? entry.after.audioStarts - entry.before.audioStarts : null;
        entry.gate = { advance, wallSeconds: entry.cpu.wallSeconds, frames, audioStarts,
          stableProcesses: entry.cpu.processIdsStable, focused: entry.samples.every(sample => sample.state?.visible && sample.state?.focused),
          errors: [...(entry.pageErrors ?? []), ...(entry.after.errors ?? [])], route: entry.after.route ?? null };
        if (!entry.gate.stableProcesses || !Number.isFinite(entry.cpu.oneCorePercent) || Math.abs(advance - entry.cpu.wallSeconds) > 1 || !entry.gate.focused
          || entry.gate.errors.length || (frames !== null && frames < entry.cpu.wallSeconds * 25)
          || (audioStarts !== null && audioStarts < entry.cpu.wallSeconds * 20)) throw Error('CPU acceptance gate failed: ' + JSON.stringify(entry.gate));
        entry.status = player === 'movi' ? 'diagnostic' : 'screened';
      } catch (error) { entry.status = 'rejected'; entry.reason = String(error.stack ?? error); }
      finally {
        console.log(`${round}/${rounds} ${player} ${entry.status} ${entry.cpu?.oneCorePercent?.toFixed(2) ?? '—'}% ${entry.reason?.split('\n')[0] ?? ''}`);
        await save();
        if (player !== 'mediabunny') await page.evaluate(() => api.stop()).catch(() => {});
        await context.close(); await delay(2000);
      }
    }
  }
} finally { await cdp?.detach().catch(() => {}); await browser?.close(); await server.close(); await save(); }

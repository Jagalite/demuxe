// SPDX-License-Identifier: Apache-2.0
// Matched exploratory whole-Chrome CPU: MediaBunny's published player vs Demuxe auto.
// Same frozen local File bytes, Chrome launch, viewport, window and process accounting.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchBenchmarkChrome, collectCpuWindow, summarizeCpu, delay, benchmarkPolicy } from '../../../tests/head-to-head/benchmark-browser.mjs';
import { serve } from '../../../tests/head-to-head/server.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const assets = path.join(root, 'build/head-to-head/assets-release-auto-fix-20260925-03');
const directory = path.resolve(process.argv.find(x => x.startsWith('--out='))?.slice(6) ?? path.join(import.meta.dirname, '../notes/official-player-cpu'));
const seconds = Number(process.argv.find(x => x.startsWith('--seconds='))?.slice(10) ?? 20);
const rounds = Number(process.argv.find(x => x.startsWith('--rounds='))?.slice(9) ?? 3);
const startupGate = !process.argv.includes('--pilot');
const demuxeUrl = process.argv.includes('--demuxe-url');
const currentRuntime = process.argv.includes('--current-runtime');
if (!Number.isInteger(rounds) || rounds < 1 || !Number.isFinite(seconds) || seconds < 5 || seconds > 25) throw Error('Invalid rounds/window');
await mkdir(directory, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(assets, 'manifest.json')));
const selectedFixture = process.argv.find(x => x.startsWith('--fixture='))?.slice(10);
const selectedPlayer = process.argv.find(x => x.startsWith('--player='))?.slice(9);
if (selectedPlayer && !['mediabunny', 'demuxe'].includes(selectedPlayer)) throw Error('Unknown player');
const fixtures = [
  ['aac-mp4', 'fixtures/aac.mp4'],
  ['aac-mkv', 'fixtures/aac.mkv'],
  ['dual-audio', 'fixtures/h264-dual-audio/index.mkv'],
  ['pcm24-mkv', 'fixtures/pcm.mkv'],
].filter(([id]) => !selectedFixture || id === selectedFixture);
if (!fixtures.length) throw Error('Unknown fixture');
const sha256 = b => createHash('sha256').update(b).digest('hex');
const result = { date: new Date().toISOString(), scope: 'Exploratory matched whole-Chrome CPU; exact File inputs, same browser lifetime, fresh context per arm; no idle subtraction',
  assets, manifestSha256: sha256(await readFile(path.join(assets, 'manifest.json'))), fixtureDuration: manifest.fixture.duration,
  policy: benchmarkPolicy, seconds, rounds, startupGate, demuxeSource: demuxeUrl ? 'range-capable URL' : 'File',
  demuxeRuntime: currentRuntime ? { source: 'current workspace build', gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    generatedIndexSha256: sha256(await readFile(path.join(root, 'web/generated/index.js'))) } : { source: 'frozen fixture snapshot', manifestSha256: sha256(await readFile(path.join(assets, 'manifest.json'))) },
  fixtures: {}, arms: [] };
for (const [id, relative] of fixtures) result.fixtures[id] = { path: relative, sha256: sha256(await readFile(path.join(assets, relative))) };
const server = await serve(currentRuntime ? root : assets, path.join(root, 'tests/head-to-head'), path.join(directory, 'requests.jsonl'));
let browser, cdp;
try {
  const launched = await launchBenchmarkChrome({ headless: !process.argv.includes('--headed'), channel: 'chrome', startupGate });
  browser = launched.browser; result.browser = launched.identity;
  cdp = await browser.newBrowserCDPSession();
  const order = [];
  for (let round = 1; round <= rounds; round++) for (const [fixture] of fixtures) {
    const arms = round % 2 ? ['mediabunny', 'demuxe'] : ['demuxe', 'mediabunny'];
    for (const player of arms) if (!selectedPlayer || player === selectedPlayer) order.push({ round, fixture, player });
  }
  for (const [index, arm] of order.entries()) {
    const { round, fixture, player } = arm;
    const source = result.fixtures[fixture].path;
    const entry = { ...arm, source, status: 'running' };
    result.arms.push(entry);
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => (entry.pageErrors ??= []).push(error.message));
    try {
      if (player === 'mediabunny') {
        await page.addInitScript(() => {
          window.__cpuProbe = { draws: 0, audioStarts: 0 };
          const draw = CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage = function (...args) {
            if (this.canvas.closest?.('#player')) window.__cpuProbe.draws++;
            return draw.apply(this, args);
          };
          const start = AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start = function (...args) { window.__cpuProbe.audioStarts++; return start.apply(this, args); };
        });
        await page.goto('https://mediabunny.dev/examples/media-player/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (!result.mediaBunnyAsset) {
          const script = await page.locator('script[src*="media-player"]').getAttribute('src');
          if (script) { const url = new URL(script, page.url()).href; const response = await page.request.get(url); result.mediaBunnyAsset = { url, sha256: sha256(await response.body()) }; }
        }
        const chooser = page.waitForEvent('filechooser');
        await page.locator('#select-file').click();
        await (await chooser).setFiles(path.join(assets, source));
        await page.locator('#player').waitFor({ state: 'visible', timeout: 30000 });
        if (await page.locator('#warning-element').textContent()) throw Error('MediaBunny warning');
        await page.locator('#play-button').evaluate(el => el.click());
      } else {
        await page.goto(`${server.origin}/harness/harness.html`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(async ({ source, demuxeUrl, currentRuntime }) => {
          const { Player } = await import(currentRuntime ? '/web/generated/index.js' : '/demuxe/web/generated/index.js');
          const stage = document.querySelector('#stage');
          window.cpuPlayer = new Player(stage, { assetBase: currentRuntime ? '/' : '/demuxe/', width: 960, height: 540 });
          await window.cpuPlayer.ready;
          const url = '/' + (currentRuntime ? 'build/head-to-head/assets-release-auto-fix-20260925-03/' : '') + source;
          if (demuxeUrl) await window.cpuPlayer.open(url);
          else {
            const response = await fetch(url);
            if (!response.ok) throw Error('Fixture fetch failed');
            const file = new File([await response.arrayBuffer()], source.split('/').at(-1));
            await window.cpuPlayer.open(file);
          }
          await window.cpuPlayer.play();
        }, { source, demuxeUrl, currentRuntime });
      }
      const snapshot = () => page.evaluate(player => {
        if (player === 'mediabunny') {
          const clock = document.querySelector('#current-time')?.textContent ?? '00:00';
          const [m, s] = clock.split(':').map(Number);
          return { position: m * 60 + s, draws: window.__cpuProbe.draws, audioStarts: window.__cpuProbe.audioStarts,
            visible: document.visibilityState === 'visible', focused: document.hasFocus(),
            error: document.querySelector('#error-element')?.textContent, warning: document.querySelector('#warning-element')?.textContent };
        }
        const p = window.cpuPlayer, video = p.current?.backend?.video;
        const quality = video?.getVideoPlaybackQuality?.();
        return { position: p.state.currentTime, route: p.diagnostics?.plan?.id ?? p.state.activeMode,
          status: p.state.status, error: p.state.error, videoFrames: quality ? quality.totalVideoFrames - quality.droppedVideoFrames : null,
          droppedFrames: quality?.droppedVideoFrames ?? null, diagnostics: p.diagnostics?.backend?.presentation ?? null };
      }, player);
      await page.waitForFunction(player => {
        if (player === 'mediabunny') {
          const [m, s] = (document.querySelector('#current-time')?.textContent ?? '0:0').split(':').map(Number);
          return m * 60 + s > 0.5 && window.__cpuProbe.draws > 5 && window.__cpuProbe.audioStarts > 5;
        }
        return window.cpuPlayer?.state.currentTime > 0.5;
      }, player, { timeout: 20000 });
      await delay(5000);
      entry.start = await snapshot();
      const samples = await collectCpuWindow(cdp, snapshot, { seconds, interval: 2 });
      entry.end = await snapshot();
      entry.cpu = summarizeCpu(samples);
      entry.samples = samples;
      const elapsed = entry.cpu.wallSeconds;
      const advance = entry.end.position - entry.start.position;
      const frameStart = player === 'mediabunny' ? entry.start.draws : entry.start.videoFrames;
      const frameEnd = player === 'mediabunny' ? entry.end.draws : entry.end.videoFrames;
      entry.gate = { advance, elapsed, frames: frameEnd - frameStart,
        audioStarts: player === 'mediabunny' ? entry.end.audioStarts - entry.start.audioStarts : null,
        route: entry.end.route ?? null, processIdsStable: entry.cpu.processIdsStable,
        visibleAndFocused: samples.every(sample => sample.state?.visible && sample.state?.focused),
        errors: entry.pageErrors ?? [] };
      const frames = entry.gate.frames;
      if (!entry.cpu.processIdsStable || !Number.isFinite(entry.cpu.oneCorePercent) || Math.abs(advance - elapsed) > 1
        || !Number.isFinite(frames) || Math.abs(frames - elapsed * 30) > 12 + elapsed * 30 * 0.01
        || entry.gate.errors.length || entry.start.error || entry.end.error || entry.start.warning || entry.end.warning
        || (player === 'mediabunny' && !entry.gate.visibleAndFocused)
        || (player === 'mediabunny' && entry.gate.audioStarts < elapsed * 20)
        || (player === 'demuxe' && !String(entry.gate.route).includes('native-direct')))
        throw Error('CPU acceptance gate failed: ' + JSON.stringify(entry.gate));
      entry.status = 'accepted';
    } catch (error) { entry.status = 'rejected'; entry.reason = String(error.stack ?? error); }
    finally {
      console.log(`${index + 1}/${order.length} ${fixture} ${player} ${entry.status} ${entry.cpu?.oneCorePercent?.toFixed(2) ?? '—'}% ${entry.reason?.split('\n')[0] ?? ''}`);
      await writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n');
      await page.evaluate(async () => { await window.cpuPlayer?.destroy?.(); }).catch(() => {});
      await context.close();
      await delay(2000);
    }
  }
} finally { await cdp?.detach().catch(() => {}); await browser?.close(); await server.close(); }
await writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n');

// SPDX-License-Identifier: Apache-2.0
// Bounded, marked-output checks of the published MediaBunny player example.
// Adapted to its public controls; omitted features are reported, not passed.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { markedImage } from '../../../tests/head-to-head/checks.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const out = path.resolve(process.argv.find(x => x.startsWith('--out='))?.slice(6)
  ?? path.join(import.meta.dirname, '../notes/official-player-qualification'));
await mkdir(out, { recursive: true });
const requestedCase = process.argv.find(arg => arg.startsWith('--case='))?.slice(7);
const catalogueAssets = process.argv.find(arg => arg.startsWith('--assets='))?.slice(9);
const fixedCases = [
  ['aac-mp4', 'H.264 + AAC / MP4', 'build/head-to-head/assets-expanded-03/fixtures/aac.mp4'],
  ['aac-mkv', 'H.264 + AAC / MKV', 'build/head-to-head/assets-expanded-03/fixtures/aac.mkv'],
  ['dual-audio', 'Dual-audio H.264 + AAC + AC-3 stereo / MKV', 'build/head-to-head/assets-release-auto-fix-20260925-03/fixtures/h264-dual-audio/index.mkv'],
  ['pcm24-mkv', 'H.264 + PCM24 / MKV', 'build/head-to-head/assets-expanded-03/fixtures/pcm.mkv'],
  ['pcm24-ass', 'H.264 + PCM24 / MKV + ASS', 'build/head-to-head/assets-expanded-03/fixtures/pcm.mkv'],
  ['h264-aac51', 'H.264 + AAC 5.1 / MP4', 'build/head-to-head/assets-release-supplement-20260925-04/fixtures/h264-aac51/index.mp4'],
  ['h264-mp3', 'H.264 + MP3 stereo / MP4', 'build/head-to-head/assets-release-supplement-20260925-04/fixtures/h264-mp3/index.mp4'],
  ['h264-ac3', 'H.264 + AC-3 5.1 / MKV', 'build/head-to-head/assets-release-supplement-20260925-04/fixtures/h264-ac3/index.mkv'],
  ['h264-eac3', 'H.264 + E-AC-3 5.1 / MKV', 'build/head-to-head/assets-release-supplement-20260925-04/fixtures/h264-eac3/index.mkv'],
  ['h264-dts', 'H.264 + DTS core 5.1 / MKV', 'build/head-to-head/assets-release-supplement-20260925-04/fixtures/h264-dts/index.mkv'],
];
let cases = fixedCases.filter(([id]) => !requestedCase || requestedCase === id);
if (requestedCase && !cases.length) {
  if (!catalogueAssets) throw Error('A catalogue-only case requires --assets=<frozen snapshot>');
  const assets = path.resolve(root, catalogueAssets);
  const catalogue = JSON.parse(await readFile(path.join(assets, 'fixtures/catalogue.json')));
  const source = catalogue[requestedCase];
  if (!source?.file || source.streamFormat || source.live || (!source.video && !source.audio))
    throw Error('Fixture needs a separate published-player qualification contract: ' + requestedCase);
  cases = [[requestedCase, source.label, path.join(assets, 'fixtures', source.file), source]];
}
if (!cases.length) throw Error('Unknown case');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const time = text => { const [m, s] = String(text).split(':').map(Number); return m * 60 + s; };
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const result = { date: new Date().toISOString(), browser: `Google Chrome ${browser.version()}`, player: 'https://mediabunny.dev/examples/media-player/', scope: 'Published player example, live deployment', cases: [] };
try {
  for (const [id, label, fixture, source] of cases) {
    const file = path.resolve(root, fixture);
    const row = { id, label, fixture, sha256: createHash('sha256').update(await readFile(file)).digest('hex'), checks: {}, errors: [], limits: ['No 1.25x playback-rate control in the published player', 'No independently observable AudioContext or decoder cleanup'] };
    if (id === 'dual-audio') row.limits.push('Published player selects primary AAC; no AC-3 track-switch control');
    if (id === 'pcm24-ass') row.limits.push('This catalogue row requires an external ASS file; the example exposes no subtitle file input');
    if (id === 'h264-aac51') row.limits.push('Stereo output check does not qualify six discrete output channels');
    if (id === 'h264-ac3') row.limits.push('Stereo output check does not qualify six discrete output channels');
    if (id === 'h264-eac3') row.limits.push('Stereo output check does not qualify six discrete output channels');
    if (id === 'h264-dts') row.limits.push('Stereo output check does not qualify six discrete output channels');
    if (source?.channels > 2) row.limits.push('Stereo output check does not qualify discrete multichannel output');
    if (source?.qualificationLimit) row.limits.push(source.qualificationLimit);
    result.cases.push(row);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on('pageerror', e => row.errors.push(e.message));
    await page.addInitScript(() => {
      const emptyTone = () => ({ samples: 0, squares: 0, intervals: 0, span: 0 });
      window.__qualify = { draws: 0, starts: 0, tones: [emptyTone(), emptyTone()], sampleRate: 0, bufferStats: [] };
      const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (this.canvas.closest?.('#player')) window.__qualify.draws++;
        return originalDraw.apply(this, args);
      };
      const originalStart = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        const q = window.__qualify;
        q.starts++;
        if (this.buffer) {
          q.sampleRate = this.buffer.sampleRate;
          for (let channel = 0; channel < Math.min(2, this.buffer.numberOfChannels); channel++) {
            const target = q.tones[channel];
            const source = this.buffer.getChannelData(channel);
            const count = Math.min(source.length, 24000 - target.samples);
            let squares = 0;
            for (let i = 0; i < count; i++) squares += source[i] ** 2;
            // AAC encoder priming can produce a near-silent first buffer whose
            // noise zero crossings are unrelated to the marked signal.
            if (count < 100 || Math.sqrt(squares / count) < 0.05) continue;
            let first = -1, last = -1, crossings = 0;
            for (let i = 1; i < count; i++) {
              if (source[i - 1] <= 0 && source[i] > 0) {
                const fraction = -source[i - 1] / (source[i] - source[i - 1]);
                const at = i - 1 + fraction;
                if (first < 0) first = at;
                last = at;
                crossings++;
              }
            }
            const hz = crossings >= 3 && last > first ? (crossings - 1) * this.buffer.sampleRate / (last - first) : 0;
            const accepted = Math.abs(hz - [440, 880][channel]) < 30;
            if (q.bufferStats.length < 30) q.bufferStats.push({ channel, sampleRate: this.buffer.sampleRate, count, crossings, span: last - first, rms: Math.sqrt(squares / count), hz, accepted });
            if (!accepted) continue;
            target.squares += squares;
            target.samples += count;
            target.intervals += crossings - 1;
            target.span += last - first;
          }
        }
        return originalStart.apply(this, args);
      };
    });
    const snap = () => page.evaluate(() => {
      const q = window.__qualify;
      const audio = q.tones.map(tone => {
        if (tone.samples < 2000 || !q.sampleRate || tone.span === 0) return { samples: tone.samples, rms: 0, hz: 0 };
        return { samples: tone.samples, rms: Math.sqrt(tone.squares / tone.samples), hz: tone.intervals * q.sampleRate / tone.span };
      });
      return { position: document.querySelector('#current-time')?.textContent, duration: document.querySelector('#duration')?.textContent,
        error: document.querySelector('#error-element')?.textContent, warning: document.querySelector('#warning-element')?.textContent,
        visible: getComputedStyle(document.querySelector('#player')).display !== 'none', draws: q.draws, audioStarts: q.starts, audio, bufferStats: q.bufferStats };
    });
    const resetAudio = () => page.evaluate(() => { window.__qualify.tones = [0, 1].map(() => ({ samples: 0, squares: 0, intervals: 0, span: 0 })); });
    const image = async name => {
      const fileName = path.join(out, `${id}-${name}.png`);
      const png = await page.locator(source?.video === false ? '#player' : '#player canvas').screenshot({ path: fileName });
      const state = await snap();
      return { file: path.relative(root, fileName), sha256: createHash('sha256').update(png).digest('hex'), marker: markedImage(png, time(state.position)), state };
    };
    const seek = async seconds => {
      const duration = time((await snap()).duration);
      const box = await page.locator('#progress-bar-container').boundingBox();
      if (!box?.width) throw Error('No seek bar');
      await page.mouse.move(box.x + box.width * seconds / duration, box.y + box.height / 2);
      await page.mouse.down(); await page.mouse.up();
      await page.waitForFunction(target => {
        const [m, s] = document.querySelector('#current-time').textContent.split(':').map(Number);
        return Math.abs(m * 60 + s - target) < 0.8;
      }, seconds, { timeout: 7000 });
      await sleep(400);
    };
    try {
      await page.goto(result.player, { waitUntil: 'networkidle', timeout: 30000 });
      if (!result.playerAsset) {
        const asset = await page.locator('script[src*="media-player"]').getAttribute('src');
        if (asset) { const url = new URL(asset, page.url()).href; const response = await page.request.get(url); result.playerAsset = { url, sha256: createHash('sha256').update(await response.body()).digest('hex') }; }
      }
      const chooser = page.waitForEvent('filechooser'); await page.locator('#select-file').click(); await (await chooser).setFiles(file);
      await Promise.race([page.locator('#player').waitFor({ state: 'visible', timeout: 30000 }), page.locator('#error-element:not(:empty)').waitFor({ state: 'visible', timeout: 30000 })]);
      row.checks.open = await snap();
      if (id === 'pcm24-ass') row.checks.subtitleControls = await page.locator('input[type="file"], track, [id*="subtitle"], [id*="caption"]').evaluateAll(elements => elements.map(element => ({ tag: element.tagName, id: element.id, accept: element.getAttribute('accept') })));
      if (!row.checks.open.visible || row.checks.open.error || row.checks.open.warning) throw Error('Open failed or downgraded: ' + JSON.stringify(row.checks.open));
      await page.locator('#play-button').evaluate(el => el.click());
      await page.waitForFunction(({ expectVideo, expectAudio }) => (!expectVideo || window.__qualify.draws > 12) && (!expectAudio || window.__qualify.starts > 15),
        { expectVideo: source?.video !== false, expectAudio: source?.audio !== false }, { timeout: 10000 });
      await sleep(350);
      row.checks.initial = await image('initial');
      await sleep(650);
      row.checks.moving = await image('moving');
      const first = row.checks.initial, second = row.checks.moving;
      if (source?.video !== false && (!first.marker.markerCorrect || !second.marker.markerCorrect || first.sha256 === second.sha256)) throw Error('Moving marked-video oracle failed');
      if (source?.audio === false) {
        if (first.state.audioStarts || second.state.audioStarts) throw Error('Video-only source emitted audio');
      } else if (![440, 880].every((hz, i) => first.state.audio[i].rms > 0.015 && Math.abs(first.state.audio[i].hz - hz) < 30)) throw Error('Marked stereo audio oracle failed: ' + JSON.stringify(first.state.audio));
      if (source?.subtitleCheck || source?.subtitle) {
        await sleep(500);
        row.checks.subtitleControls = await page.locator('input[type="file"], track, [id*="subtitle"], [id*="caption"]').evaluateAll(elements => elements.map(element => ({ tag: element.tagName, id: element.id, accept: element.getAttribute('accept') })));
        row.checks.subtitle = await image('subtitle');
        row.checks.subtitle.visibleText = await page.locator('#player').evaluate(element => element.textContent);
        if (source.subtitle) throw Error('Required external subtitle cannot be supplied through published player controls');
        if (source.subtitleCheck === 'text' && !row.checks.subtitle.visibleText.replace(/[^A-Z0-9]/gi, '').toUpperCase().includes('DEMUXETEST123'))
          throw Error('Required embedded subtitle text missing');
        if (['ass', 'bitmap'].includes(source.subtitleCheck) && row.checks.subtitle.marker.magentaPixels <= 150)
          throw Error('Required embedded subtitle drawing missing');
      }
      if (id === 'pcm24-ass') throw Error('Required external ASS subtitle cannot be supplied through published player controls');
      await page.locator('#play-button').evaluate(el => el.click());
      const beforePause = time((await snap()).position); await sleep(450); const paused = time((await snap()).position);
      row.checks.pause = { beforePause, paused, delta: paused - beforePause };
      if (Math.abs(paused - beforePause) > 0.12) throw Error('Pause did not stop timeline');
      await page.locator('#play-button').evaluate(el => el.click()); await sleep(400);
      const resumed = time((await snap()).position); row.checks.resume = { resumed, delta: resumed - paused };
      if (resumed < paused + 0.2) throw Error('Resume did not advance timeline');
      row.checks.seeks = [];
      for (const target of [6, 1, 10]) {
        await resetAudio(); await seek(target); await sleep(400);
        const state = await image(`seek-${target}`);
        row.checks.seeks.push({ target, ...state });
        if (Math.abs(time(state.state.position) - target) > 1.4 || (source?.video !== false && !state.marker.markerCorrect)) throw Error(`Seek ${target}: timeline or marked-video oracle failed`);
        if (source?.audio === false) {
          if (state.state.audioStarts) throw Error(`Seek ${target}: video-only source emitted audio`);
        } else if (![440, 880].every((hz, i) => state.state.audio[i].rms > 0.015 && Math.abs(state.state.audio[i].hz - hz) < 30)) throw Error(`Seek ${target}: marked audio oracle failed: ${JSON.stringify(state.state.audio)}`);
      }
      const duration = time((await snap()).duration); await seek(duration - 0.65); await sleep(1500);
      const eof = await snap(); await sleep(450); const settled = await snap();
      row.checks.eof = { duration, eof, settled };
      if (time(eof.position) < duration - 0.2 || Math.abs(time(settled.position) - time(eof.position)) > 0.1) throw Error('EOF did not settle');
      row.status = 'screened';
    } catch (error) { row.status = 'failed'; row.failure = String(error); }
    console.log(JSON.stringify({ id, status: row.status, failure: row.failure, limits: row.limits }));
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(path.join(out, 'result.json'));

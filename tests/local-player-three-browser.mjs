// SPDX-License-Identifier: Apache-2.0
import {chromium, firefox, webkit} from 'playwright';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtimeRoot = path.resolve(process.env.DEMUXE_RUNTIME_ROOT || root);
const out = path.join(root, 'results/local-player-three-browser', new Date().toISOString().replaceAll(':', '-'));
const modes = ['native', 'hybrid', 'software'];
const families = [['chrome', chromium], ['firefox', firefox], ['webkit', webkit]];
const result = {
  started: new Date().toISOString(),
  scope: 'Local File input, native presentation callbacks and video frame counters, public playback/control state and screenshots; software/hybrid audio sample counters. No native audio-output, audible-output, endurance or packaged-release claim.',
  passed: false,
  expectedCases: families.length * modes.length,
  command: [process.execPath, ...process.execArgv, ...process.argv.slice(1)],
  runtimeRoot,
  runtimeIdentity: process.env.LOCAL_PLAYER_URL ? 'External server; local hashes do not establish served asset identity' : 'Owned scripts/serve.mjs server using the recorded runtime root',
  hashes: {},
  browsers: [],
};
await mkdir(out, {recursive: true});
console.log(out);
const persist = () => writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
let server;

async function startServer() {
  if (process.env.LOCAL_PLAYER_URL) return process.env.LOCAL_PLAYER_URL;
  result.serverCommand = [process.execPath, 'scripts/serve.mjs'];
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: root,
    env: {...process.env, PORT: '0', DEMUXE_RUNTIME_ROOT: runtimeRoot},
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return new Promise((resolve, reject) => {
    let output = '';
    const cleanup = () => {
      clearTimeout(timer);
      server.stdout.off('data', onData);
      server.off('error', onError);
      server.off('exit', onExit);
    };
    const onError = error => { cleanup(); reject(error); };
    const onExit = (code, signal) => onError(Error(`Player server exited before readiness: ${code ?? signal}`));
    const onData = data => {
      output += data;
      const origin = /http:\/\/127\.0\.0\.1:\d+/.exec(output)?.[0];
      if (origin) { cleanup(); resolve(origin); }
    };
    const timer = setTimeout(() => onError(Error('Player server readiness timed out')), 10000);
    server.stdout.on('data', onData);
    server.once('error', onError);
    server.once('exit', onExit);
  });
}

// Presentation counters can reset across seeks. Require fresh moving output in
// each uninterrupted resume window, retaining raw counters for diagnosis.
async function resumeWithOutput(page, check, label, target) {
  await page.evaluate(target => {
    const surface = core.surface;
    const native = core.state.activeMode === 'native';
    if (native && typeof surface?.requestVideoFrameCallback !== 'function') throw Error('Native presentation callback unavailable');
    const sample = window.outputWindow = {target, evidence: native ? 'requestVideoFrameCallback' : 'backend-rendered-delta', renderedBefore: core.diagnostics.backend?.rendered, callbacks: 0, firstMediaTime: null, lastMediaTime: null};
    let handle, stopped = false;
    const frame = (_now, metadata) => {
      if (stopped || core.surface !== surface) return;
      if (metadata.mediaTime >= target - .1 && (sample.lastMediaTime === null ? metadata.mediaTime <= target + .75 : metadata.mediaTime > sample.lastMediaTime)) {
        sample.callbacks++;
        sample.firstMediaTime ??= metadata.mediaTime;
        sample.lastMediaTime = metadata.mediaTime;
      }
      handle = surface.requestVideoFrameCallback(frame);
    };
    window.stopOutputWindow = () => { stopped = true; if (handle !== undefined) surface.cancelVideoFrameCallback(handle); };
    if (native) handle = surface.requestVideoFrameCallback(frame);
  }, target);
  try {
    await page.evaluate(() => core.play());
    await page.waitForFunction(() => {
      const sample = window.outputWindow;
      const output = sample.evidence === 'requestVideoFrameCallback'
        ? sample.callbacks >= 3 && sample.lastMediaTime - sample.firstMediaTime >= .1
        : core.diagnostics.backend?.rendered - sample.renderedBefore >= 3;
      return output && core.state.status === 'playing' && core.state.currentTime > sample.target + .4;
    });
  } finally {
    const evidence = await page.evaluate(() => {
      window.stopOutputWindow?.();
      const sample = {...window.outputWindow, renderedAfter: core.diagnostics.backend?.rendered, time: core.state.currentTime, status: core.state.status};
      delete window.stopOutputWindow; delete window.outputWindow;
      return sample;
    });
    (check.outputWindows ??= []).push({label, ...evidence});
  }
}

async function stopServer() {
  if (!server || !server.pid) return;
  if (server.exitCode !== null || server.signalCode !== null) {
    result.serverCleanup = {exitCode: server.exitCode, signal: server.signalCode};
    return;
  }
  await new Promise((resolve, reject) => {
    const finish = (code, signal) => {
      clearTimeout(killTimer);
      clearTimeout(deadlineTimer);
      result.serverCleanup = {exitCode: code, signal};
      resolve();
    };
    server.once('exit', finish);
    const killTimer = setTimeout(() => server.kill('SIGKILL'), 3000);
    const deadlineTimer = setTimeout(() => {
      server.off('exit', finish);
      reject(Error('Owned player server teardown timed out'));
    }, 5000);
    server.kill('SIGTERM');
  });
}

try {
  for (const [name, base] of [
    ['tests/local-player-three-browser.mjs', root],
    ['tests/head-to-head/browser-exit.mjs', root],
    ['scripts/serve.mjs', root],
    ['src/player/index.ts', root],
    ['src/unified-player.ts', root],
    ['web/generated/player/index.js', runtimeRoot],
    ['web/generated/unified-player.js', runtimeRoot],
    ['fixtures/example.mp4', root],
  ]) result.hashes[name] = createHash('sha256').update(await readFile(path.join(base, name))).digest('hex');
  result.origin = await startServer();
  await persist();
  for (const [family, engine] of families) {
    const row = {family, passed: false, checks: [], errors: []};
    result.browsers.push(row);
    let browser;
    try {
      row.launchOptions = {headless: true, ...(family === 'chrome' ? {channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required']} : {})};
      browser = await engine.launch(row.launchOptions);
      row.version = browser.version();
      const page = await browser.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push(String(error)));
      await page.goto(result.origin);
      await page.evaluate(async () => {
        window.viewer = document.querySelector('#viewer');
        await viewer.ready;
        window.core = viewer.player;
      });
      for (const mode of modes) {
        const check = {mode, passed: false};
        row.checks.push(check);
        try {
          await page.evaluate(async mode => {
            await viewer.close();
            await core.setAutomaticSelection(false);
            await core.setMode(mode);
            await core.setMuted(false);
            await core.setPlaybackRate(1);
          }, mode);
          await page.locator('#viewer #file').setInputFiles(path.join(root, 'fixtures/example.mp4'));
          await page.waitForFunction(() => core.state.status === 'playing' && core.state.currentTime > .3 && core.diagnostics.backend?.rendered > 2);
          if (mode !== 'native') await page.waitForFunction(() => core.audioDiagnostics()?.mediaFrames > 128);
          check.loaded = await page.evaluate(() => ({source: viewer.lastSource?.name, mode: core.state.activeMode, time: core.state.currentTime, rendered: core.diagnostics.backend?.rendered, audio: core.audioDiagnostics()}));
          assert.equal(check.loaded.source, 'example.mp4');
          assert.equal(check.loaded.mode, mode);
          await page.evaluate(async () => { await core.pause(); await core.seek(4); await core.setVolume(.4); await core.setMuted(true); await core.setPlaybackRate(1.5); });
          const state = await page.evaluate(() => core.state);
          assert.equal(state.status, 'paused');
          assert.ok(Math.abs(state.currentTime - 4) < .5);
          assert.equal(state.volume, .4);
          assert.equal(state.muted, true);
          assert.equal(state.playbackRate, 1.5);
          await resumeWithOutput(page, check, 'forward-seek-rate-1.5', 4);
          await page.evaluate(async () => { await core.pause(); await core.seek(1); await core.setMuted(false); await core.setPlaybackRate(1); });
          await resumeWithOutput(page, check, 'backward-seek-rate-1', 1);
          check.finalPlayback = await page.evaluate(() => ({time: core.state.currentTime, rendered: core.diagnostics.backend?.rendered, audio: core.audioDiagnostics()}));
          await page.screenshot({path: path.join(out, `${family}-${mode}.png`)});
          await page.evaluate(() => viewer.close());
          await page.waitForFunction(() => core.state.status === 'idle' && core.state.sourceId === null && core.state.pendingOperation === null);
          check.passed = true;
        } catch (error) {
          check.error = String(error.stack ?? error);
          check.state = await page.evaluate(() => ({status: core.state.status, error: core.state.error, mode: core.state.activeMode, time: core.state.currentTime})).catch(() => null);
        }
        await persist();
        console.log(family, mode, check.passed ? 'PASS' : 'FAIL', check.error?.split('\n')[0] ?? '');
      }
    } catch (error) {
      row.failure = String(error.stack ?? error);
      console.error(family, row.failure);
    } finally {
      if (browser) {
        try { row.cleanup = await closeTestBrowser(browser, family); }
        catch (error) { row.cleanupFailure = String(error.stack ?? error); }
      }
      row.passed = !row.failure && !row.cleanupFailure && !row.errors.length && row.checks.length === modes.length && row.checks.every(check => check.passed);
      await persist();
    }
  }
} catch (error) {
  result.failure = String(error.stack ?? error);
  console.error(result.failure);
} finally {
  try { await stopServer(); }
  catch (error) { result.cleanupFailure = String(error.stack ?? error); }
  result.completedCases = result.browsers.reduce((sum, row) => sum + row.checks.length, 0);
  result.passed = !result.failure && !result.cleanupFailure && result.browsers.length === families.length && result.completedCases === result.expectedCases && result.browsers.every(row => row.passed);
  result.finished = new Date().toISOString();
  await persist();
  if (!result.passed) process.exitCode = 1;
}

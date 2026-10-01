// SPDX-License-Identifier: MIT
import http from 'node:http';
import path from 'node:path';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const [buildArg, outputArg, fixtureArg, referenceArg, audioReferenceInput, profileArg] = process.argv.slice(2);
if (!buildArg || !outputArg || !fixtureArg || !referenceArg) throw Error('Usage: node run-playback.mjs EXTERNAL_BUILD FRESH_EVIDENCE_DIR MPEG2_FIXTURE RGB24_REFERENCE');
const audioReferenceArg = audioReferenceInput === '-' ? undefined : audioReferenceInput;
const profile = profileArg ? JSON.parse(await readFile(profileArg, 'utf8')) : {width: 320, height: 180, fps: 24, duration: 4};
const {width, height, fps} = profile;
const root = path.resolve(import.meta.dirname, '../../../..');
const build = path.resolve(buildArg), output = path.resolve(outputArg);
if (!Number.isInteger(width) || width < 1 || width > 1920 || !Number.isInteger(height) || height < 1 || height > 1080 || !Number.isFinite(fps) || fps <= 0 || !Number.isFinite(profile.duration) || profile.duration < 3) throw Error('Invalid fixture profile');
await mkdir(output, {recursive: false});
await writeFile(path.join(output, 'profile.json'), JSON.stringify(profile, null, 2) + '\n');
const files = new Map(), hashes = {};
const add = async (url, source, snapshot) => {
  const bytes = await readFile(source);
  hashes[url] = {source, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
  files.set(url, bytes);
  if (snapshot) {
    const dest = path.join(output, 'sources', snapshot);
    await mkdir(path.dirname(dest), {recursive: true});
    await writeFile(dest, bytes);
  }
};
for (const name of ['engine.js', 'scheduler.js', 'continuations.js', 'range-source.js'])
  await add('/runtime/' + name, path.join(root, 'web/private-mpv', name), 'runtime/' + name);
await add('/worker.mjs', path.join(import.meta.dirname, 'playback-worker.mjs'), 'playback-worker.mjs');
await add('/private-pcm-transport.mjs', path.join(import.meta.dirname, 'private-pcm-transport.mjs'), 'private-pcm-transport.mjs');
await add('/audio-worklet.js', path.join(root, 'web/private-mpv/audio-worklet.js'), 'audio-worklet.js');
await add('/private-playback-host.mjs', path.join(import.meta.dirname, 'private-playback-host.mjs'), 'private-playback-host.mjs');
await add('/fixture.ts', path.resolve(fixtureArg), 'fixture.ts');
const reference = await readFile(referenceArg);
hashes['reference'] = {source: path.resolve(referenceArg), sha256: createHash('sha256').update(reference).digest('hex'), bytes: reference.length};
const buildRecord = JSON.parse(await readFile(path.join(build, 'build.json'), 'utf8'));
if (buildRecord.status !== 'built_candidate_only' || buildRecord.dependencyProfile !== 'playback') throw Error('Successful private playback build required');
for (const name of ['playback.mjs', 'playback.wasm', 'playback.asyncify.wasm']) {
  await add('/engine/' + name, path.join(build, name));
  if (hashes['/engine/' + name].sha256 !== buildRecord.artifacts[name]) throw Error('Build artifact drift: ' + name);
}
const server = http.createServer((req, res) => {
  if (req.url === '/') {res.setHeader('Content-Type', 'text/html');res.end('<!doctype html><title>Private Software video playback</title>');return;}
  const bytes = files.get(req.url);
  if (!bytes) {res.writeHead(404).end();return;}
  res.setHeader('Content-Type', req.url.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
  res.end(bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const result = {scope: 'Experimental private MPEG-2 video-only playback',
  startedAt: new Date().toISOString(), build, sourceSHA256: hashes, cases: [], headless: true,
  command: process.argv, mediaExecuted: true};
let browser;
try {
  browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required']});
  result.browser = browser.version();
  for (const backend of ['jspi', 'asyncify']) {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const test = await page.evaluate(async ({backend, audio, profile}) => {
      let context, node;
      const channel = new MessageChannel();
      if (audio) {
        context = new AudioContext({sampleRate: 48000});
        await context.audioWorklet.addModule('/audio-worklet.js');
        node = new AudioWorkletNode(context, 'demuxe-private-pcm', {numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2]});
        node.port.postMessage({type: 'connect', port: channel.port1}, [channel.port1]);
        node.connect(context.destination);await context.resume();
        await new Promise(resolve => {node.port.onmessage = ({data}) => {if (data.type === 'recording') resolve();};node.port.postMessage({type: 'record', id: 'start'});});
      }
      return await new Promise(resolve => {
      const worker = new Worker('/worker.mjs', {type: 'module'});
      const canvas = document.createElement('canvas');document.body.append(canvas);
      const offscreen = canvas.transferControlToOffscreen();
      let finished = false;const progress = [];
      const finish = async data => {
        if (finished) return;finished = true;
        clearTimeout(timer);worker.terminate();
        if (node) {
          data.audio = await new Promise(resolve => {
            const timeout = setTimeout(() => resolve({error: 'Inspection deadline'}), 1000);
            node.port.onmessage = ({data: d}) => {if (d.type === 'inspection') {clearTimeout(timeout);resolve({...d, pcm: Array.from(new Float32Array(d.pcm))});}};
            node.port.postMessage({type: 'inspect', id: 'end'});
          });
          node.disconnect();node.port.close();await context.close();
          data.audio.contextState = context.state;
        }
        resolve(data);
      };
      const timer = setTimeout(() => finish({passed: false, backend, error: 'Playback watchdog: 45 seconds', progress}), 45000);
      worker.onerror = e => finish({passed: false, backend, error: e.message});
      worker.onmessage = ({data}) => {if (data.type === 'progress') {progress.push(data);return;}finish(data);};
      worker.postMessage({backend, canvas: offscreen, fixture: '/fixture.ts', width: profile.width, height: profile.height, duration: profile.duration, audioPort: audio ? channel.port2 : undefined, latencyUs: context ? Math.round(context.baseLatency * 1e6) : 0}, audio ? [offscreen, channel.port2] : [offscreen]);
    });
    }, {backend, audio: !!audioReferenceArg, profile});
    for (const capture of test.captures ?? []) {
      const rgba = capture.rgba;delete capture.rgba;
      const rgb = Buffer.alloc(width * height * 3);
      for (let i = 0; i < width * height; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = rgba[i * 4 + c];
      const name = backend + '-seek-' + capture.target + '.rgb';
      await writeFile(path.join(output, name), rgb);
      let best = {mae: Infinity};let wrongColorMAE = Infinity;
      // Compare every independent decoded reference frame to detect a wrong
      // seek picture rather than accepting mere nonblack/changing pixels.
      for (let frame = Math.max(0, Math.floor((capture.target - 1) * fps)); frame <= Math.ceil((capture.target + 1) * fps) && (frame + 1) * rgb.length <= reference.length; frame++) {
        let sum = 0, wrongSum = 0;
        for (let i = 0; i < rgb.length; i++) {
          sum += Math.abs(rgb[i] - reference[frame * rgb.length + i]);
          const channel = i % 3;
          const swapped = channel === 0 ? i + 2 : channel === 2 ? i - 2 : i;
          wrongSum += Math.abs(rgb[swapped] - reference[frame * rgb.length + i]);
        }
        wrongColorMAE = Math.min(wrongColorMAE, wrongSum / rgb.length);
        const mae = sum / rgb.length;
        if (mae < best.mae) best = {mae, frame, time: frame / fps};
      }
      capture.reference = best;capture.picture = name;capture.wrongColorControl = {mae: wrongColorMAE, rejected: wrongColorMAE >= 5};
      capture.passed = capture.wrongColorControl.rejected && best.mae < 5 && Math.abs(best.time - capture.target) <= 1 / fps + 0.001;
      if (!capture.passed) {test.passed = false;test.pictureFailure = true;}
    }
    if (audioReferenceArg && (test.audio?.error || !Array.isArray(test.audio?.pcm))) {
      test.audio = {...test.audio, passed: false, error: test.audio?.error ?? 'Missing PCM inspection'};
      test.passed = false;
    } else if (audioReferenceArg) {
      const pcm = Float32Array.from(test.audio.pcm);delete test.audio.pcm;
      const bytes = await readFile(audioReferenceArg);
      const ref = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      await writeFile(path.join(output, backend + '-audio.f32'), Buffer.from(pcm.buffer));
      let best = {rmse: Infinity};
      const count = Math.min(48000, pcm.length);
      // Capture the first audible half-second and align to the independent
      // decoder within the codec startup-delay allowance (0.1 s).
      for (let offset = 0; offset <= 4800 && offset + count <= ref.length; offset += 2) {
        let sum = 0;
        for (let i = 0; i < count; i++) {const delta = pcm[i] - ref[offset + i];sum += delta * delta;}
        const rmse = Math.sqrt(sum / count);
        if (rmse < best.rmse) best = {rmse, offsetFrames: offset / 2};
      }
      test.audio.reference = best;test.audio.samples = pcm.length;
      test.audio.passed = pcm.length > 48000 && best.rmse < 0.002 && !test.audio.failed && test.audio.maxQueued <= 8192 && test.audio.contextState === 'closed';
      if (!test.audio.passed) test.passed = false;
    }
    result.cases.push(test);
    console.log(JSON.stringify({backend, passed: test.passed, draws: test.draws, captures: test.captures?.map(c => c.reference), error: test.error}));
    await writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    await Promise.race([page.close(), new Promise(resolve => setTimeout(resolve, 3000))]);
    if (!test.passed) process.exitCode = 1;
  }
} catch (error) {
  result.error = String(error.stack ?? error);process.exitCode = 1;
} finally {
  result.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  await writeFile(path.join(output, 'build.json'), await readFile(path.join(build, 'build.json')));
  await Promise.race([browser?.close(), new Promise(resolve => setTimeout(resolve, 3000))]);
  server.closeAllConnections();
  // Bound shutdown of this test server; browser workers reported native cleanup
  // before returning their result. Retain any harness callback timeout.
  let serverClosed = false;
  await Promise.race([new Promise(resolve => server.close(() => {serverClosed = true;resolve();})), new Promise(resolve => setTimeout(resolve, 1000))]);
  result.harnessCleanup = {serverClosed};
  await writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
}

// Playwright/Node may retain internal handles after browser and server close.
// This CLI owns the process, and all evidence writes above have completed.
process.exit(process.exitCode ?? 0);

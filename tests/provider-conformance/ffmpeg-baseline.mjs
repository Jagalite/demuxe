// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyProvider, checkUnchanged, sha} from './package.mjs';

const MAX_INPUT = 64 * 1024 * 1024, MAX_OUTPUT = 96 * 1024 * 1024;
const harnessDirectory = path.dirname(fileURLToPath(import.meta.url));
export function selectBaselineArtifacts(provider, profile) {
  const fact = provider.manifest.provides.find(fact => fact.offers.some(offer =>
    offer.capability === 'media.prepare.file' && offer.version === 1 && offer.profile === profile));
  if (!fact) return {blocked: 'Packaged FFmpeg does not declare media.prepare.file/1/' + profile};
  const runtime = provider.name === '@demuxe/provider-ffmpeg-asyncify' ? 'asyncify'
    : provider.name === '@demuxe/provider-ffmpeg-jspi' ? 'jspi' : undefined;
  if (!runtime) return {blocked: 'No maintained Worker baseline adapter for this FFmpeg package; use the Asyncify or JSPI package'};
  const engine = 'web/engine-' + (['packet-copy', 'video-only'].includes(profile) ? 'remux-' : 'adaptation-') + runtime + '/remux';
  const names = {factoryURL: engine + '.mjs', wasmURL: engine + '.wasm', bridgeURL: 'web/private-ffmpeg/bridge.js'};
  for (const name of [...Object.values(names), 'web/private-ffmpeg/single-owner.js', 'web/private-ffmpeg/range-source.js']) {
    assert.ok(provider.artifactPaths(fact).includes(name), 'Baseline artifact outside selected fact: ' + name);
  }
  return {factId: fact.id, runtime, names};
}

export async function runFFmpegBaseline({baseline, jobs, outputDirectory, timeout = 120000, browser = 'chromium', coreVersion, expectedInputs}) {
  const provider = await verifyProvider(baseline, coreVersion);
  if (expectedInputs) assert.deepEqual(provider.inputs, expectedInputs, 'Baseline changed after parent verification');
  assert.ok(/^@demuxe\/provider-ffmpeg(?:-|$)/.test(provider.name), 'Expected a packaged FFmpeg baseline provider');
  await mkdir(outputDirectory, {recursive: true});
  const rows = [], pending = [], inputHashes = new Map(), served = new Map();
  const addFile = async (url, filename, digest) => {
    const bytes = await readFile(filename); assert.ok(!digest || sha(bytes) === digest, 'Baseline input integrity: ' + filename);
    served.set(url, {bytes, filename, digest: sha(bytes)});
  };
  for (const [name, digest] of Object.entries(provider.manifest.artifacts)) await addFile('/baseline/' + name, path.join(provider.root, name), digest);
  for (const name of ['ffmpeg-baseline-browser.mjs', 'ffmpeg-baseline-worker.mjs', 'ffmpeg-baseline-page.mjs']) await addFile('/harness/' + name, path.join(harnessDirectory, name));
  for (const [index, job] of jobs.entries()) {
    const row = {index, kind: job.kind, profile: job.profile, candidatePackage: job.candidatePackage, providerId: job.providerId,
      candidateImplementationIdentity: job.candidateImplementationIdentity, baselineImplementationIdentity: provider.identity, status: 'blocked'};
    rows.push(row);
    if (job.blocked || job.status === 'blocked') {row.reason = job.blocked ?? job.reason; continue;}
    const selected = selectBaselineArtifacts(provider, job.profile);
    if (selected.blocked) {row.reason = selected.blocked; continue;}
    for (const name of [job.input, job.candidate, job.candidatePCM, job.candidatePackets, job.candidateTiming, job.sourceTiming].filter(Boolean)) {
      const bytes = await readFile(name); assert.ok(bytes.length <= MAX_INPUT, 'Parity fixture/output input exceeds budget');
      inputHashes.set(name, sha(bytes));
    }
    assert.ok(job.input && inputHashes.has(job.input), 'Missing parity source fixture');
    await addFile('/fixture/' + index, job.input);
    row.fixtureSHA256 = inputHashes.get(job.input); row.baselineProviderId = selected.factId; row.runtime = selected.runtime;
    pending.push({index, profile: job.profile, container: job.target ?? 'mp4', fixtureURL: '/fixture/' + index,
      urls: {...Object.fromEntries(Object.entries(selected.names).map(([key, name]) => [key, '/baseline/runtime/' + name])), runtime: selected.runtime}});
  }
  const result = {package: {path: provider.root, name: provider.name, version: provider.version, implementationIdentity: provider.identity, inputs: provider.inputs},
    scope: 'Packaged Wasm FFmpeg rm_* preparation versus candidate contract outputs; host FFmpeg only measures both outputs. Browser playback, routing and raw PCM above FLAC24 precision are separate gates.',
    rows, browser: undefined, harnessInputs: Object.fromEntries([...served.values()].filter(item => item.filename.startsWith(harnessDirectory)).map(item => [item.filename, item.digest]))};
  if (!pending.length) {await checkUnchanged(provider); return result;}
  const token = randomBytes(24).toString('hex');
  const cancellation = new AbortController();
  let finish, reject, timer, automation;
  const completed = new Promise((resolve, fail) => {finish = resolve; reject = fail;});
  completed.catch(() => {});
  const received = new Set();
  const server = createServer(async (req, res) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/') {
        assert.equal(url.searchParams.get('token'), token, 'Wrong browser session');
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><meta charset="utf-8"><title>Packaged FFmpeg provider parity</title><pre id="status">Running packaged FFmpeg parity</pre><script type="module" src="/harness/ffmpeg-baseline-page.mjs"></script>'); return;
      }
      if (url.pathname === '/jobs') {
        assert.equal(url.searchParams.get('token'), token, 'Wrong browser session');
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({jobs: pending, timeout, maxInputBytes: MAX_INPUT, maxOutputBytes: MAX_OUTPUT})); return;
      }
      if (req.method === 'POST') {
        assert.equal(url.searchParams.get('token'), token, 'Wrong browser session');
        assert.equal(req.headers.origin, 'http://127.0.0.1:' + server.address().port, 'Wrong browser origin');
        const chunks = []; let length = 0;
        for await (const bytes of req) {length += bytes.length; assert.ok(length <= MAX_OUTPUT, 'Browser output exceeds budget'); chunks.push(bytes);}
        const body = Buffer.concat(chunks);
        if (url.pathname === '/complete') {
          assert.equal(received.size, pending.length, 'Browser did not complete all baseline jobs');
          result.browser = JSON.parse(body); res.end('saved'); finish(); return;
        }
        const index = Number(url.searchParams.get('index'));
        assert.ok(pending.some(job => job.index === index) && !received.has(index), 'Invalid/duplicate baseline job result');
        const row = rows[index];
        if (url.pathname === '/error') {
          const error = JSON.parse(body); row.status = error.blocked ? 'blocked' : 'failed'; row.reason = String(error.error); row.baselineDiagnostics = error;
        } else {
          assert.equal(url.pathname, '/output'); assert.ok(body.length > 0, 'Empty baseline output');
          const file = path.join(outputDirectory, 'baseline-' + index + '.mp4'); await writeFile(file, body);
          row.baselineOutput = file; row.baselineOutputSHA256 = sha(body);
          const {compareParity, baselineTimelineBias} = await import('./ffmpeg-parity.mjs');
          try {
            const signal = AbortSignal.any([cancellation.signal, AbortSignal.timeout(timeout)]);
            const origin = await baselineTimelineBias(jobs[index].input, {signal});
            Object.assign(row, origin);
            row.checks = await compareParity({...jobs[index], baselineTimelineBiasSeconds: origin.baselineTimelineBiasSeconds}, file, {signal}); row.status = 'passed';
          }
          catch (error) {row.status = 'failed'; row.reason = String(error.stack ?? error);}
        }
        received.add(index); console.log('Packaged FFmpeg parity ' + row.kind + ' [' + index + ']: ' + row.status);
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(row));
      } else {
        assert.equal(req.method, 'GET'); const entry = served.get(url.pathname);
        if (!entry) {res.statusCode = 404; res.end('Unknown baseline test path'); return;}
        res.setHeader('Content-Type', /\.m?js$/.test(url.pathname) ? 'text/javascript' : url.pathname.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
        res.end(entry.bytes);
      }
    } catch (error) {res.statusCode = 500; res.end(String(error.stack ?? error)); cancellation.abort(); reject(error);}
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port + '/?token=' + token;
    console.log('Packaged FFmpeg parity browser: ' + url);
    timer = setTimeout(() => {cancellation.abort(); reject(Error('Packaged FFmpeg browser matrix deadline exceeded'));}, Math.min(3600000, timeout * pending.length + 120000));
    if (browser !== 'external') {
      assert.equal(browser, 'chromium', 'Unknown baseline browser');
      const {chromium} = await import('playwright'); automation = await chromium.launch({headless: true});
      const page = await automation.newPage(); await page.goto(url);
    }
    await completed;
    for (const [filename, digest] of inputHashes) assert.equal(sha(await readFile(filename)), digest, 'Parity input changed: ' + filename);
    for (const {filename, digest} of served.values()) assert.equal(sha(await readFile(filename)), digest, 'Baseline staged input changed: ' + filename);
    await checkUnchanged(provider);
  } catch (error) {
    result.error = String(error.stack ?? error);
    for (const job of pending) if (!received.has(job.index)) {rows[job.index].status = 'failed'; rows[job.index].reason = result.error;}
    await writeFile(path.join(outputDirectory, 'parity.json'), JSON.stringify(result, null, 2) + '\n');
    error.baselineReport = result; throw error;
  } finally {
    clearTimeout(timer); cancellation.abort(); await automation?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
  await writeFile(path.join(outputDirectory, 'parity.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

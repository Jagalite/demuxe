// SPDX-License-Identifier: Apache-2.0
// Exploratory one-core CPU sampling for previously passing README cells.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {chromium} from 'playwright';
import {serve} from '../../../../tests/head-to-head/server.mjs';
import {closeBrowserObserved} from '../../../../tests/head-to-head/browser-exit.mjs';

const repo = path.resolve(import.meta.dirname, '../../../../');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const {values: args} = parseArgs({options: {
  assets: {type: 'string'}, plan: {type: 'string'}, output: {type: 'string'},
  rounds: {type: 'string', default: '3'}, warmup: {type: 'string', default: '5'},
  measure: {type: 'string', default: '20'}, limit: {type: 'string'},
  exclusive: {type: 'boolean', default: false}, channel: {type: 'string', default: 'chrome'},
}});
if (!args.assets || !args.plan || !args.output || !args.exclusive)
  throw Error('Provide --assets, --plan, --output and --exclusive');
const rounds = Number(args.rounds), warmup = Number(args.warmup), measureSeconds = Number(args.measure);
if (!Number.isInteger(rounds) || rounds < 3 || warmup < 5 || measureSeconds < 20 || measureSeconds % 2)
  throw Error('Use at least 3 rounds, 5s warmup and a 20s measurement window in 2s increments');
const assets = path.resolve(args.assets), output = path.resolve(args.output);
const planPath = path.resolve(args.plan), manifestBytes = await fs.readFile(path.join(assets, 'manifest.json'));
const assetManifest = JSON.parse(manifestBytes);
const planBytes = await fs.readFile(planPath);
const fullPlan = JSON.parse(planBytes);
const planSHA = sha(planBytes);
const plan = args.limit ? fullPlan.slice(0, Number(args.limit)) : fullPlan;
if (!plan.length) throw Error('No CPU cells selected');

// Verify the frozen player/runtime/media and merged specialist fixtures once.
for (const [name, item] of Object.entries(assetManifest.files)) {
  const file = path.resolve(assets, name);
  if (!file.startsWith(assets + path.sep) || sha(await fs.readFile(file)) !== item.sha256)
    throw Error('Asset snapshot mismatch: ' + name);
}
const manifestSha = sha(manifestBytes);
const fixtureCatalogue = JSON.parse(await fs.readFile(path.join(assets, 'fixtures/catalogue.json'), 'utf8'));
for (const cell of plan) if (!fixtureCatalogue[cell.fixture]) throw Error('Missing fixture: ' + cell.fixture);

await fs.mkdir(path.join(output, 'runs'), {recursive: true});
const harnessDir = path.join(output, 'files/harness');
await fs.mkdir(harnessDir, {recursive: true});
const capturedSources = ['server.mjs', 'browser-exit.mjs', 'harness.html', 'adapters.mjs',
  'checks.mjs', 'performance-metrics.mjs', 'matrix.json', 'assets.lock.json'];
const sourceHashes = {};
for (const name of capturedSources) {
  const bytes = await fs.readFile(path.join(repo, 'tests/head-to-head', name));
  sourceHashes[name] = sha(bytes);
  await fs.writeFile(path.join(harnessDir, name), bytes);
}
const harnessSha = sha(Buffer.from(JSON.stringify(sourceHashes)));
await fs.copyFile(path.join(assets, 'manifest.json'), path.join(output, 'assets-manifest.json'));
await fs.copyFile(planPath, path.join(output, 'cells.json'));

const summaryPath = path.join(output, 'summary.json');
let summary = await fs.readFile(summaryPath, 'utf8').then(JSON.parse).catch(() => ({
  schema: 1, kind: 'exploratory-pass-cell-cpu', startedAt: new Date().toISOString(),
  sourceRevision: assetManifest.git_revision, sourceDirtyDiff: assetManifest.dirty_diff,
  assets: path.relative(repo, assets), assetsSHA256: manifestSha, harnessSHA256: harnessSha,
  harnessSourceHashes: sourceHashes, planSHA256: planSHA,
  host: {platform: os.platform(), release: os.release(), architecture: os.arch(), cpus: os.cpus().length},
  browserIdentity: null, protocol: {rounds, warmupSeconds: warmup, measureSeconds,
    cpu: 'Sum of CDP-listed Chromium process CPU-time deltas divided by the measured wall window, percent of one core.',
    accepted: 'Full window; visible and focused; stable Chromium process IDs; timeline advances within 1.0s of wall time.',
    skippedGates: ['No playback correctness rerun', 'No image, audio, subtitle, frame-cadence, dropped-frame, seek, EOF, HDR or surround fidelity gate'],
    route: 'The actual route label is recorded at every sample; fallback remains part of the measured cell.',
    capture: 'Fresh headed Chrome process per cell-round; 2s samples; isolated browser context; local assets.'},
  plannedCells: fullPlan.length, selectedCells: plan.map(cell => cell.id), cases: [], cellSummaries: [],
  limits: ['Descriptive CPU for these frozen synthetic/local fixtures only; not a matched cross-player ranking.',
    'A prior pass or Pass* label is retained as historical context and was not revalidated for this CPU run.',
    'CPU includes CDP-listed Chrome processes; excludes the fixture server, external OS media services, GPU energy and physical output.',
    'Shared-host results; any unaccepted windows and their reasons remain in raw round records.'],
}));
if (summary.assetsSHA256 !== manifestSha || summary.harnessSHA256 !== harnessSha
  || summary.planSHA256 !== planSHA)
  throw Error('Resume identity differs from the saved CPU run');
summary.selectedCells = [...new Set([...summary.selectedCells, ...plan.map(cell => cell.id)])];
const save = async () => fs.writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n');

const requestLog = path.join(output, `requests-${new Date().toISOString().replaceAll(':', '-')}.jsonl`);
const server = await serve(assets, harnessDir, requestLog);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = async (promise, ms, label) => {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => timer = setTimeout(() => reject(Error(label + ' deadline')), ms))]); }
  finally { clearTimeout(timer); }
};
const processSet = sample => sample.processes.map(item => item.id).sort((a, b) => a - b).join(',');
const processCpu = sample => sample.processes.reduce((total, item) => total + item.cpuTime, 0);

const schedule = [];
for (let round = 1; round <= rounds; round++) {
  const fixtures = [...new Set(plan.map(cell => cell.fixture))];
  for (const fixture of fixtures) {
    const group = plan.filter(cell => cell.fixture === fixture);
    for (let index = 0; index < group.length; index++) {
      const cell = group[(index + round - 1) % group.length];
      if (!summary.cases.some(record => record.id === cell.id && record.round === round))
        schedule.push({...cell, round});
    }
  }
}

let activeBrowser;
try {
  for (const cell of schedule) {
    const fixture = fixtureCatalogue[cell.fixture];
    const directory = path.join(output, 'runs', `${cell.id}.round-${cell.round}`);
    await fs.mkdir(directory, {recursive: false});
    const record = {...cell, roundStartedAt: new Date().toISOString(), status: 'running', samples: [],
      openWallMs: null, errorsDuringWindow: [], requestFailures: []};
    summary.cases.push(record); await save();
    let page, context, cdp;
    const startedAt = Date.now();
    try {
      activeBrowser = await chromium.launch({headless: false,
        ...(args.channel ? {channel: args.channel} : {}),
        args: ['--autoplay-policy=no-user-gesture-required'], timeout: 20000});
      summary.browserIdentity = `chromium/${activeBrowser.version()}/${args.channel}/headed`;
      record.browserIdentity = summary.browserIdentity;
      context = await activeBrowser.newContext({viewport: {width: 960, height: 540}, deviceScaleFactor: 1});
      page = await context.newPage(); page.setDefaultTimeout(10000);
      page.on('pageerror', error => { if (record.errorsDuringWindow.length < 50) record.errorsDuringWindow.push(String(error)); });
      page.on('requestfailed', request => record.requestFailures.push({url: request.url(), error: request.failure()}));
      page.on('response', response => { if (response.status() >= 400) record.requestFailures.push({url: response.url(), status: response.status()}); });
      await page.goto(server.origin + '/harness/harness.html');
      await page.bringToFront();
      await page.waitForFunction(() => window.api);
      const config = {...cell, ...fixture};
      const openStarted = Date.now();
      await bounded(page.evaluate(value => api.start(value), config), 25000, 'player open/play');
      record.openWallMs = Date.now() - openStarted;
      await page.waitForFunction(() => Number.isFinite(api.snapshot().position) && api.snapshot().position > 0.25,
        null, {timeout: 10000});
      await delay(warmup * 1000);
      cdp = await activeBrowser.newBrowserCDPSession();
      record.samples = [];
      for (let tick = 0; tick <= measureSeconds; tick += 2) {
        const info = (await cdp.send('SystemInfo.getProcessInfo')).processInfo;
        const state = await page.evaluate(() => api.snapshot());
        record.samples.push({at: Date.now(), processes: info.map(item => ({id: item.id, type: item.type, cpuTime: item.cpuTime})),
          position: state.position, route: state.route ?? null, visible: state.visible, focused: state.focused,
          errors: (state.errors ?? []).slice(0, 12).map(String)});
        if (tick + 2 <= measureSeconds) await delay(2000);
      }
      const first = record.samples[0], last = record.samples.at(-1);
      const wallSeconds = (last.at - first.at) / 1000;
      const timelineAdvance = last.position - first.position;
      const stableProcesses = record.samples.every(sample => processSet(sample) === processSet(first));
      const foreground = record.samples.every(sample => sample.visible && sample.focused);
      const cpuSeconds = processCpu(last) - processCpu(first);
      record.measurement = {wallSeconds, timelineAdvance, cpuSeconds,
        oneCorePercent: wallSeconds > 0 ? 100 * cpuSeconds / wallSeconds : null,
        stableProcesses, foreground,
        routeSamples: [...new Set(record.samples.map(sample => String(sample.route ?? 'unknown')))],
        accepted: wallSeconds >= measureSeconds - 0.25 && stableProcesses && foreground
          && Math.abs(timelineAdvance - wallSeconds) < 1 && cpuSeconds >= 0,
        ...(wallSeconds < measureSeconds - 0.25 ? {exclusionReason: 'measurement window was incomplete'} : {}),
        ...(!stableProcesses ? {exclusionReason: 'Chromium process set changed during window'} : {}),
        ...(!foreground ? {exclusionReason: 'browser lost visible foreground focus'} : {}),
        ...(Math.abs(timelineAdvance - wallSeconds) >= 1 ? {exclusionReason: 'timeline did not advance at approximately 1x for the full window'} : {}),
        ...(cpuSeconds < 0 ? {exclusionReason: 'reported CDP process CPU time decreased'} : {}),
        scope: 'CDP-listed Chromium process family; fixture server and external OS/GPU work excluded.'};
      record.status = record.measurement.accepted ? 'accepted' : 'excluded';
      record.errorsDuringWindow = [...new Set([...record.errorsDuringWindow, ...record.samples.flatMap(sample => sample.errors)])].slice(0, 50);
    } catch (error) {
      record.status = 'failed-to-measure';
      record.reason = String(error.stack ?? error);
      if (page) record.failureState = await page.evaluate(() => api?.snapshot?.()).catch(() => null);
    } finally {
      if (page) record.stop = await bounded(page.evaluate(() => api.stop()), 5000, 'player cleanup')
        .catch(error => ({error: String(error)}));
      const processIDs = [...new Set(record.samples.flatMap(sample => sample.processes.map(item => item.id)))];
      if (cdp) await cdp.detach().catch(() => {});
      if (context) await bounded(context.close(), 10000, 'browser context teardown').catch(error => {
        record.cleanupError = String(error);
      });
      if (activeBrowser) {
        try {
          const finalSession = await activeBrowser.newBrowserCDPSession();
          const info = (await finalSession.send('SystemInfo.getProcessInfo')).processInfo;
          for (const process of info) processIDs.push(process.id);
          await finalSession.detach();
        } catch {}
        try { record.browserCleanup = await closeBrowserObserved(activeBrowser, [...new Set(processIDs)]); }
        catch (error) { record.cleanupError = String(error); }
      }
      if (record.cleanupError || record.browserCleanup?.remainingProcessIDs?.length) {
        if (record.measurement) {
          record.measurement.accepted = false;
          record.measurement.exclusionReason = 'browser process teardown was not confirmed';
        }
        record.status = record.measurement ? 'excluded' : record.status;
      }
      activeBrowser = null;
      record.elapsedSeconds = (Date.now() - startedAt) / 1000;
      record.roundFinishedAt = new Date().toISOString();
      await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n');
      await save();
      const value = record.measurement?.oneCorePercent;
      console.log(`${record.status.toUpperCase()} ${cell.id} r${cell.round}${value == null ? '' : ` ${value.toFixed(2)}% CPU`}${record.measurement?.exclusionReason ? ` — ${record.measurement.exclusionReason}` : ''}`);
    }
  }
} finally {
  await activeBrowser?.close().catch(() => {});
  await server.close();
}

const rows = plan.map(cell => {
  const trials = summary.cases.filter(record => record.id === cell.id);
  const valid = trials.filter(record => record.measurement?.accepted && Number.isFinite(record.measurement.oneCorePercent));
  const values = valid.map(record => record.measurement.oneCorePercent).sort((a, b) => a - b);
  const median = values.length ? (values.length % 2 ? values[(values.length - 1) / 2]
    : (values[values.length / 2 - 1] + values[values.length / 2]) / 2) : null;
  return {...cell, attempts: trials.length, acceptedRounds: valid.length, medianOneCorePercent: median,
    minimumOneCorePercent: values.length ? values[0] : null,
    maximumOneCorePercent: values.length ? values.at(-1) : null,
    routes: [...new Set(valid.flatMap(record => record.measurement.routeSamples))],
    records: trials.map(record => `runs/${record.id}.round-${record.round}/result.json`)};
});
summary.cellSummaries = rows;
summary.finishedAt = new Date().toISOString();
summary.counts = {planned: plan.length,
  cellsWithAnyAcceptedWindow: rows.filter(row => row.acceptedRounds > 0).length,
  cellsWithThreeAcceptedWindows: rows.filter(row => row.acceptedRounds >= 3).length,
  fidelityLimitedCells: rows.filter(row => row.fidelityLimited).length,
  attemptedRounds: summary.cases.length,
  acceptedRounds: summary.cases.filter(record => record.measurement?.accepted).length,
  excludedOrFailedRounds: summary.cases.filter(record => !record.measurement?.accepted).length};
await save();

const roundLinks = row => row.records.length
  ? row.records.map((record, index) => `[R${index + 1}](${record})`).join(' / ') : '—';
const fmt = value => value == null ? '—' : `${value.toFixed(1)}%`;
const lines = ['# Exploratory CPU measurements for README passing cells', '',
  `Source revision: \`${summary.sourceRevision}\`; browser: \`${summary.browserIdentity ?? 'not launched'}\`.`,
  `CPU figures use CDP-listed Chrome process time over wall time. ${summary.counts.acceptedRounds} of ${summary.counts.attemptedRounds} windows were accepted; ${summary.counts.cellsWithAnyAcceptedWindow} of ${summary.counts.planned} cells have a CPU median.`,
  '', 'This campaign deliberately skipped correctness, image/audio/subtitle, frame-cadence, dropped-frame, seek, EOF, HDR and surround fidelity admission. A window is retained only when Chrome stays foregrounded, its process set is stable and the timeline advances at approximately 1x. These per-cell diagnostics are not matched comparisons and do not qualify the historical Pass or Pass* labels.',
  '', '| README row | Cell | CPU median (% one core) | Accepted / attempted | Range | Route observed | Round records |',
  '| --- | --- | ---: | ---: | ---: | --- | --- |'];
for (const row of rows) lines.push(`| ${row.readmeRow} | ${row.readmeColumn} | ${fmt(row.medianOneCorePercent)} | ${row.acceptedRounds} / ${row.attempts} | ${fmt(row.minimumOneCorePercent)}–${fmt(row.maximumOneCorePercent)} | ${row.routes.join(', ') || '—'} | ${roundLinks(row)} |`);
await fs.writeFile(path.join(output, 'CPU-REPORT.md'), lines.join('\n') + '\n');
const report = ['# Passing-cell CPU run', '',
  `Planned ${summary.counts.planned} README cells; accepted ${summary.counts.acceptedRounds}/${summary.counts.attemptedRounds} CPU windows, yielding values for ${summary.counts.cellsWithAnyAcceptedWindow} cells (${summary.counts.cellsWithThreeAcceptedWindows} with three accepted rounds).`,
  '', 'No playback status or fidelity label was reclassified. See [CPU report](CPU-REPORT.md) and the per-round JSON records.', ''];
await fs.writeFile(path.join(output, 'REPORT.md'), report.join('\n'));
const captured = {};
for (const name of (await fs.readdir(output, {recursive: true})).sort()) {
  const file = path.join(output, name);
  if ((await fs.stat(file)).isFile() && name !== 'manifest.json') captured[name.replaceAll(path.sep, '/')] = sha(await fs.readFile(file));
}
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({schema: 1,
  scope: 'Hashes of CPU run scripts, request log, reports, summaries and per-round records.', sha256: captured}, null, 2) + '\n');
console.log(JSON.stringify({output, ...summary.counts}, null, 2));

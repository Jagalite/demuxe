// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, lstat} from 'node:fs/promises';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {verifyProvider, checkUnchanged, contractKey, sha} from '../tests/provider-conformance/package.mjs';
import {selectSuite} from '../tests/provider-conformance/registry.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
export function parseArguments(args) {
  const parsed = {providers: []};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '--list') parsed[arg.slice(2)] = true;
    else {
      assert.ok(['--provider', '--core', '--config', '--output', '--timeout', '--baseline', '--browser'].includes(arg), 'Unknown argument: ' + arg);
      const value = args[++i]; assert.ok(value && !value.startsWith('--'), 'Missing value: ' + arg);
      if (arg === '--provider') parsed.providers.push({path: value}); else parsed[arg.slice(2)] = value;
    }
  }
  return parsed;
}
export async function resolveConfig(arguments_) {
  const filename = arguments_.config && path.resolve(arguments_.config);
  const configuration = filename ? JSON.parse(await readFile(filename)) : {schema: 1, providers: []};
  assert.equal(configuration.schema, 1, 'Unsupported suite config schema');
  const base = filename ? path.dirname(filename) : process.cwd();
  const resolve = name => path.resolve(base, name);
  const adapter = specification => specification && {...specification, ...(specification.module ? {module: resolve(specification.module)} : {})};
  const providers = [...(configuration.providers ?? []), ...arguments_.providers.map(item => ({...item, path: path.resolve(item.path)}))].map(item => ({...item, path: resolve(item.path),
    adapter: adapter(item.adapter), adapters: item.adapters?.map(adapter),
    fixtures: item.fixtures?.map(fixture => ({...fixture, input: resolve(fixture.input),
      ...Object.fromEntries(['reference', 'integerReference', 'doubleReference'].filter(key => fixture[key]).map(key => [key, resolve(fixture[key])]))})),
    ...(item.containerFixture ? {containerFixture: resolve(item.containerFixture)} : {}),
    ...(item.muxFixture ? {muxFixture: resolve(item.muxFixture)} : {})}));
  assert.ok(providers.length && providers.length <= 256, 'Supply at least one --provider or config provider');
  const output = path.resolve(arguments_.output ?? (configuration.output ? resolve(configuration.output) : path.join('build/provider-conformance', Date.now().toString())));
  const timeout = Number(arguments_.timeout ?? configuration.timeout ?? 120000);
  assert.ok(Number.isSafeInteger(timeout) && timeout >= 100 && timeout <= 3600000, 'Invalid per-contract timeout');
  const core = arguments_.core ? path.resolve(arguments_.core) : configuration.core ? resolve(configuration.core) : undefined;
  const customSuites = (configuration.suites ?? []).map(suite => ({...suite, module: resolve(suite.module)}));
  const baseline = arguments_.baseline ? path.resolve(arguments_.baseline) : configuration.baseline ? resolve(configuration.baseline) : undefined;
  const browser = arguments_.browser ?? configuration.browser ?? 'chromium';
  assert.ok(['chromium', 'external'].includes(browser), 'Baseline browser must be chromium or external');
  const keys = customSuites.map(contractKey); assert.equal(new Set(keys).size, keys.length, 'Duplicate custom suite contracts');
  return {providers, output, timeout, core, customSuites, baseline, browser, list: arguments_.list === true,
    configPath: filename,
    configSHA256: filename ? sha(await readFile(filename)) : undefined};
}
export function runWorker(data, timeout) {
  return new Promise(resolve => {
    assert.notEqual(process.platform, 'win32', 'Provider suite requires POSIX subprocess groups');
    const worker = fork(fileURLToPath(new URL('../tests/provider-conformance/worker.mjs', import.meta.url)), [],
      {detached: true, execArgv: [], stdio: ['ignore', 'ignore', 'pipe', 'ipc']});
    let stderr = '';
    worker.stderr.on('data', data => {stderr = (stderr + data.toString()).slice(-8192);});
    let settled = false;
    const finish = async result => {
      if (settled) return; settled = true; clearTimeout(timer);
      const killGroup = signal => {try {process.kill(-worker.pid, signal);} catch (error) {if (error.code !== 'ESRCH') throw error;}};
      try {
        killGroup('SIGTERM');
        // Kill the group even if its leader has exited: descendants may remain.
        await new Promise(resolve => setTimeout(resolve, 100)); killGroup('SIGKILL');
        if (worker.exitCode === null && worker.signalCode === null) {
          await Promise.race([once(worker, 'exit'), new Promise((_, reject) => setTimeout(() => reject(Error('Provider subprocess did not exit')), 2000))]);
        }
      } catch (error) {result = {...result, status: 'failed', cleanupError: String(error)};}
      if (stderr) result.subprocessLog = stderr;
      resolve(result);
    };
    const timer = setTimeout(() => finish({status: 'failed', error: 'Provider contract exceeded ' + timeout + ' ms', timedOut: true}), timeout);
    worker.once('message', finish);
    worker.once('error', error => finish({status: 'failed', error: String(error.stack)}));
    worker.once('exit', code => {if (!settled) finish({status: 'failed', error: 'Provider worker exited without results: ' + code});});
    worker.send(data);
  });
}
export function reportStatus(contracts) {
  return contracts.some(row => row.status === 'failed') ? 'failed'
    : contracts.length && contracts.every(row => row.status === 'passed') ? 'passed'
    : 'incomplete';
}
export async function runProviders(configuration) {
  const {output} = configuration;
  // Fresh evidence prevents a stale successful report from surviving a new run.
  try {await lstat(output); throw Error('Output directory must be fresh: ' + output);} catch (error) {if (error.code !== 'ENOENT') throw error;}
  for (const item of configuration.providers) assert.ok(output !== item.path && !output.startsWith(item.path + path.sep), 'Output must be outside candidate packages');
  if (configuration.baseline) assert.ok(output !== configuration.baseline && !output.startsWith(configuration.baseline + path.sep), 'Output must be outside baseline package');
  await mkdir(output, {recursive: true});
  const report = {schema: 1, passed: false, status: 'incomplete', qualification: 'not-granted',
    scope: 'Exact candidate artifacts under the listed contract checks and fixture scopes; playback, browser, performance and release qualification require their maintained gates',
    started: new Date().toISOString(), node: process.version, configSHA256: configuration.configSHA256,
    packages: [], contracts: [], harnessInputs: {}};
  const validated = [];
  try {
    const {readdir} = await import('node:fs/promises');
    const directory = path.join(repository, 'tests/provider-conformance');
    for (const name of await readdir(directory)) if (name.endsWith('.mjs')) {
      report.harnessInputs['tests/provider-conformance/' + name] = sha(await readFile(path.join(directory, name)));
    }
    report.harnessInputs['scripts/test-providers.mjs'] = sha(await readFile(fileURLToPath(import.meta.url)));
    if (!configuration.list) {
      const {execFileSync} = await import('node:child_process');
      report.referenceTools = Object.fromEntries(['ffmpeg', 'ffprobe'].map(binary => [binary,
        execFileSync(binary, ['-version'], {encoding: 'utf8', timeout: 10000}).split('\n')[0]]));
    }
    let coreVersion;
    if (configuration.core) {
      const bytes = await readFile(path.join(configuration.core, 'package.json')), core = JSON.parse(bytes);
      assert.equal(core.name, 'demuxe', 'Expected demuxe core package'); coreVersion = core.version;
      report.core = {path: configuration.core, version: core.version, packageSHA256: sha(bytes)};
    }
    const baselineProvider = configuration.baseline && await verifyProvider(configuration.baseline, coreVersion);
    if (baselineProvider) validated.push(baselineProvider);
    for (const item of configuration.providers) {
      const provider = await verifyProvider(item.path, coreVersion); validated.push(provider);
      report.packages.push({path: provider.root, name: provider.name, version: provider.version,
        implementationIdentity: provider.identity, inputs: provider.inputs});
      for (const fact of provider.manifest.provides) for (const offer of fact.offers) {
        const custom = configuration.customSuites.find(suite => contractKey(suite) === contractKey(offer));
        const selected = custom ?? selectSuite(offer);
        const row = {package: provider.name, providerId: fact.id, implementationIdentity: provider.identity, ...offer,
          suite: custom ? custom.module : selected?.suite, status: 'unsupported'};
        report.contracts.push(row);
        if (!selected) {row.reason = 'No maintained test suite for this exact capability/version/profile'; continue;}
        if (configuration.list) {row.status = 'planned'; continue;}
        const directory = path.join(output, 'contract-' + (report.contracts.length - 1));
        await mkdir(directory, {recursive: true});
        Object.assign(row, await runWorker({item, factId: fact.id, offer,
          suite: custom ? {module: custom.module} : selected.suite, codec: selected.codec,
          outputDirectory: directory, coreVersion, expectedInputs: provider.inputs}, configuration.timeout));
        console.log(fact.id + ' ' + offer.capability + '/' + offer.profile + ': ' + row.status);
      }
    }
    if (configuration.baseline) {
      const {runFFmpegBaseline} = await import('../tests/provider-conformance/ffmpeg-baseline.mjs');
      const jobs = report.contracts.flatMap(row => {
        const checks = row.parityJobs ?? row.checks?.flatMap(check => check.parityJobs ?? []) ?? [];
        return (checks.length ? checks : [{blocked: 'No maintained packaged FFmpeg comparison for this contract', kind: 'unavailable', profile: row.profile}])
          .flatMap(job => [job, ...(job.rawPrecisionParity?.status === 'blocked' ? [{kind: 'raw-precision', profile: job.profile, blocked: job.rawPrecisionParity.reason}] : [])])
          .map(job => ({...job, candidatePackage: row.package, providerId: row.providerId, candidateImplementationIdentity: row.implementationIdentity,
            ...(row.status !== 'passed' ? {blocked: 'Candidate contract did not pass: ' + row.status} : {})}));
      });
      if (configuration.list) {
        const baseline = baselineProvider;
        report.baseline = {path: baseline.root, name: baseline.name, version: baseline.version, implementationIdentity: baseline.identity, inputs: baseline.inputs, status: 'planned'};
      } else {
        report.baseline = await runFFmpegBaseline({baseline: configuration.baseline, jobs, outputDirectory: path.join(output, 'ffmpeg-parity'),
          timeout: configuration.timeout, browser: configuration.browser, coreVersion, expectedInputs: baselineProvider.inputs});
      }
    }
    for (const provider of validated) await checkUnchanged(provider);
    for (const [name, digest] of Object.entries(report.harnessInputs)) {
      assert.equal(sha(await readFile(path.join(repository, name))), digest, 'Harness changed during testing: ' + name);
    }
    if (configuration.configPath) assert.equal(sha(await readFile(configuration.configPath)), report.configSHA256, 'Config changed during testing');
    if (report.core) assert.equal(sha(await readFile(path.join(report.core.path, 'package.json'))), report.core.packageSHA256, 'Core metadata changed during testing');
    report.status = reportStatus([...report.contracts, ...(report.baseline?.rows ?? [])]); report.passed = report.status === 'passed';
  } catch (error) {report.status = 'failed'; report.error = String(error.stack ?? error); if (error.baselineReport) report.baseline = error.baselineReport;}
  report.finished = new Date().toISOString();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
export async function main(args = process.argv.slice(2)) {
  const arguments_ = parseArguments(args);
  if (arguments_.help) {
    console.log('Usage: npm run test:providers -- --provider PACKAGE_DIR [--provider PACKAGE_DIR ...] [--baseline FFMPEG_PACKAGE_DIR] [--browser chromium|external] [--core CORE_DIR] [--config CONFIG.json] [--output FRESH_DIR] [--timeout MS] [--list]'); return 0;
  }
  const configuration = await resolveConfig(arguments_), report = await runProviders(configuration);
  console.log('Provider conformance ' + report.status + ': ' + path.join(configuration.output, 'report.json'));
  return configuration.list && !report.error ? 0 : report.passed ? 0 : report.status === 'incomplete' ? 2 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {process.exitCode = await main();} catch (error) {console.error(String(error.stack)); process.exitCode = 1;}
}

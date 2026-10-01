// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {encoded, sha} from './package.mjs';
import {parseArguments, resolveConfig, runProviders, reportStatus} from '../../scripts/test-providers.mjs';

async function fixture(t, {capability = 'test.new', profile = 'bounded', code = 'export const value=42;', adapter = '', checks = ''} = {}) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'demuxe-provider-suite-'))); t.after(() => rm(root, {recursive: true, force: true}));
  const candidate = path.join(root, 'package'); await mkdir(path.join(candidate, 'runtime'), {recursive: true});
  await writeFile(path.join(candidate, 'runtime/entry.mjs'), code);
  const artifacts = {'runtime/entry.mjs': sha(Buffer.from(code))}, identity = 'sha256:' + sha(encoded(artifacts));
  const offer = {capability, version: 1, profile};
  await writeFile(path.join(candidate, 'package.json'), JSON.stringify({name: '@example/provider-new', version: '0.3.0-beta.4', peerDependencies: {demuxe: '0.3.0-beta.4'}}));
  await writeFile(path.join(candidate, 'provider-manifest.json'), JSON.stringify({schema: 1, providerContractVersion: 1,
    package: '@example/provider-new', version: '0.3.0-beta.4', compatibleCore: '0.3.0-beta.4', artifacts,
    assets: [{id: 'candidate', path: 'entry.mjs', bytes: Buffer.byteLength(code), sha256: artifacts['runtime/entry.mjs'], dependencies: []}],
    provides: [{id: 'replacement-123', implementationIdentity: identity, technology: 'javascript', delivery: ['optional-assets'], assetIds: ['candidate'], offers: [offer]}]}));
  const adapterFile = path.join(root, 'adapter.mjs'), suiteFile = path.join(root, 'suite.mjs');
  if (adapter) await writeFile(adapterFile, adapter);
  if (checks) await writeFile(suiteFile, checks);
  const configuration = {providers: [{path: candidate, ...(adapter ? {adapter: {module: adapterFile}} : {})}],
    output: path.join(root, 'evidence'), timeout: 5000, customSuites: checks ? [{...offer, module: suiteFile}] : []};
  return {root, candidate, configuration, adapterFile, suiteFile};
}
const adapter = 'export async function createAdapter(context){const candidate=await context.importArtifact("entry.mjs");return candidate;}';
const checks = 'export async function runChecks({adapter}){if(adapter.value!==42)throw Error("Wrong implementation");return {passed:true,scope:"candidate exported value"};}';

test('unknown capabilities remain incomplete with every offer represented', async t => {
  const {configuration} = await fixture(t); const report = await runProviders(configuration);
  assert.equal(report.passed, false); assert.equal(report.status, 'incomplete'); assert.equal(report.contracts.length, 1);
  assert.equal(report.contracts[0].status, 'unsupported'); assert.equal(report.qualification, 'not-granted');
  assert.equal(JSON.parse(await readFile(path.join(configuration.output, 'report.json'))).passed, false);
});
test('an arbitrary provider ID and namespace can use exact custom contract checks', async t => {
  const {configuration, adapterFile, suiteFile} = await fixture(t, {adapter, checks}); const report = await runProviders(configuration);
  assert.equal(report.status, 'passed'); assert.equal(report.contracts[0].providerId, 'replacement-123');
  assert.ok(report.contracts[0].adapterInputs[adapterFile]); assert.ok(report.contracts[0].adapterInputs[suiteFile]);
  assert.deepEqual(report.contracts[0].importedArtifacts, ['entry.mjs']);
});
test('programmatic invocation does not inherit parent eval-only Node flags', async t => {
  const {configuration} = await fixture(t, {adapter, checks});
  const {execFile} = await import('node:child_process'); const {promisify} = await import('node:util');
  const entry = new URL('../../scripts/test-providers.mjs', import.meta.url).href;
  const source = 'import {runProviders} from ' + JSON.stringify(entry) + ';const result=await runProviders(' + JSON.stringify(configuration)
    + ');process.stdout.write(JSON.stringify({status:result.status,error:result.error}));';
  const {stdout} = await promisify(execFile)(process.execPath, ['--input-type=module', '--eval', source], {timeout: 30000});
  assert.equal(JSON.parse(stdout.trim().split('\n').at(-1)).status, 'passed');
});
test('tests actually execute the selected implementation', async t => {
  const {configuration} = await fixture(t, {code: 'export const value=99;', adapter, checks});
  const report = await runProviders(configuration); assert.equal(report.status, 'failed'); assert.match(report.contracts[0].error, /Wrong implementation/);
});
test('declared artifact corruption fails before candidate execution', async t => {
  const {candidate, configuration} = await fixture(t, {adapter, checks}); await writeFile(path.join(candidate, 'runtime/entry.mjs'), 'throw Error("executed");');
  const report = await runProviders(configuration); assert.equal(report.status, 'failed'); assert.match(report.error, /integrity mismatch/);
  assert.equal(report.contracts.length, 0);
});
test('missing decoder adapter is blocked rather than silently passing', async t => {
  const {configuration} = await fixture(t, {capability: 'audio.decode.ac3', profile: '48khz-fltp'});
  const report = await runProviders(configuration); assert.equal(report.status, 'incomplete'); assert.equal(report.contracts[0].status, 'blocked');
});
test('undeclared transitive imports fail even when a file exists beside candidate entry', async t => {
  const {candidate, configuration} = await fixture(t, {code: 'export {value} from "./hidden.mjs";', adapter, checks});
  await writeFile(path.join(candidate, 'runtime/hidden.mjs'), 'export const value=42;');
  const report = await runProviders(configuration); assert.equal(report.status, 'failed'); assert.match(report.contracts[0].error, /Undeclared candidate import/);
});
test('custom checks must explicitly pass and state their bounded scope', async t => {
  const {configuration} = await fixture(t, {adapter, checks: 'export const runChecks=()=>({passed:true});'});
  const report = await runProviders(configuration); assert.equal(report.status, 'failed'); assert.match(report.contracts[0].error, /scope/);
});
test('provider hangs are terminated and leave a failed report', async t => {
  const {configuration} = await fixture(t, {adapter: 'export function createAdapter(){while(true){}}', checks}); configuration.timeout = 300;
  const report = await runProviders(configuration); assert.equal(report.status, 'failed'); assert.equal(report.contracts[0].timedOut, true);
});
test('contract timeout kills spawned reference-tool children', async t => {
  const state = await fixture(t, {checks});
  const pidFile = path.join(state.root, 'child.pid');
  await writeFile(state.adapterFile, `
    import {spawn} from 'node:child_process';
    import {writeFile} from 'node:fs/promises';
    export async function createAdapter() {
      const child=spawn(process.execPath,['-e','setTimeout(()=>{},60000)'],{stdio:'ignore'});
      await writeFile(${JSON.stringify(pidFile)},String(child.pid));
      return new Promise(()=>{});
    }`);
  state.configuration.providers[0].adapter = {module: state.adapterFile};
  state.configuration.timeout = 10000;
  let pid;
  try {
    const report = await runProviders(state.configuration);
    assert.equal(report.status, 'failed'); assert.equal(report.contracts[0].timedOut, true);
    pid = Number(await readFile(pidFile, 'utf8')); assert.ok(Number.isSafeInteger(pid) && pid > 0);
    let alive = true;
    for (let attempt = 0; attempt < 40 && alive; attempt++) {
      try {process.kill(pid, 0);} catch (error) {if (error.code === 'ESRCH') alive = false; else throw error;}
      if (alive) await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(alive, false, 'Timed-out contract left a child process alive');
  } finally {
    if (!pid) {try {pid = Number(await readFile(pidFile, 'utf8'));} catch {}}
    if (Number.isSafeInteger(pid) && pid > 0) {try {process.kill(pid, 'SIGKILL');} catch (error) {if (error.code !== 'ESRCH') throw error;}}
  }
});
test('contract timeout interrupts synchronous reference-tool execution', async t => {
  const state = await fixture(t, {checks});
  const marker = path.join(state.root, 'sync-started');
  await writeFile(state.adapterFile, `
    import {execFileSync} from 'node:child_process';
    import {writeFileSync} from 'node:fs';
    export function createAdapter() {
      writeFileSync(${JSON.stringify(marker)},'started');
      execFileSync(process.execPath,['-e','setTimeout(()=>{},30000)']);
      return {value:42};
    }`);
  state.configuration.providers[0].adapter = {module: state.adapterFile};
  state.configuration.timeout = 10000;
  const started = Date.now(), report = await runProviders(state.configuration);
  assert.equal(await readFile(marker, 'utf8'), 'started', 'Synchronous child test never started');
  assert.equal(report.status, 'failed'); assert.equal(report.contracts[0].timedOut, true);
  assert.ok(Date.now() - started < 20000, 'Timeout waited for synchronous child to finish');
});
test('custom harness input collection records transitive code and package metadata', async t => {
  const state = await fixture(t);
  const helper = path.join(state.root, 'helper.mjs'), metadata = path.join(state.root, 'package.json');
  await writeFile(helper, 'export const value=42;');
  await writeFile(metadata, '{"type":"module"}');
  await writeFile(state.adapterFile, 'export {value} from "./helper.mjs"; export const read=()=>import("node:fs/promises");');
  const {collectHarnessInputs} = await import('./harness-inputs.mjs');
  const inputs = await collectHarnessInputs(state.adapterFile);
  assert.equal(inputs[helper], sha(await readFile(helper)));
  assert.equal(inputs[state.adapterFile], sha(await readFile(state.adapterFile)));
  assert.equal(inputs[metadata], sha(await readFile(metadata)));
});
test('custom harness input collection rejects computed imports', async t => {
  const state = await fixture(t);
  await writeFile(state.adapterFile, 'const name="./unrecorded.mjs"; export const load=()=>import(name);');
  const {collectHarnessInputs} = await import('./harness-inputs.mjs');
  await assert.rejects(() => collectHarnessInputs(state.adapterFile), /Computed harness import/);
});
test('cleanup mutation of the native conditional export invalidates a passing check', async t => {
  const state = await fixture(t, {checks});
  const dependency = path.join(state.root, 'node_modules/conditional-helper');
  await mkdir(dependency, {recursive: true});
  await writeFile(path.join(dependency, 'package.json'), JSON.stringify({name: 'conditional-helper', type: 'module',
    exports: {module: './bundler.mjs', import: './native.mjs'}}));
  const native = path.join(dependency, 'native.mjs'), source = 'export const value=42;';
  await writeFile(native, source);
  await writeFile(path.join(dependency, 'bundler.mjs'), 'throw Error("Bundler condition must not execute");');
  await writeFile(state.adapterFile, 'import {value} from "conditional-helper"; import {writeFile} from "node:fs/promises";'
    + 'export async function createAdapter(context){const candidate=await context.importArtifact("entry.mjs");'
    + 'return {value:candidate.value+value-42,dispose:()=>writeFile(' + JSON.stringify(native) + ',"export const value=99;")};}');
  state.configuration.providers[0].adapter = {module: state.adapterFile};
  const report = await runProviders(state.configuration);
  assert.equal(report.status, 'failed');
  assert.equal(report.contracts[0].adapterInputs[native], sha(Buffer.from(source)));
  assert.match(report.contracts[0].error, /Test input changed/);
  assert.equal(report.contracts[0].checks[0].passed, true, 'The check must pass before cleanup invalidates the run');
});
test('an explicitly supplied AC3 surround fixture is executed and its missing input fails', async t => {
  const state = await fixture(t, {capability: 'audio.decode.ac3', profile: '48khz-fltp',
    adapter: 'export const createAdapter=()=>({createDecoder(){throw Error("Fixture must be read first");}});'});
  state.configuration.providers[0].fixtures = [{id: 'explicit-surround', codec: 'ac3', sampleRate: 48000,
    channels: 6, input: path.join(state.root, 'missing-surround.mkv')}];
  const report = await runProviders(state.configuration);
  assert.equal(report.status, 'failed');
  assert.match(report.contracts[0].error, /ENOENT.*missing-surround/);
});
test('input mutation during adapter cleanup invalidates an otherwise passing result', async t => {
  const state = await fixture(t, {checks});
  const source = 'export async function createAdapter(context){const candidate=await context.importArtifact("entry.mjs");return {...candidate,dispose:async()=>{const fs=await import("node:fs/promises");await fs.writeFile(' + JSON.stringify(path.join(state.candidate, 'runtime/entry.mjs')) + ',"changed");}};}';
  await writeFile(state.adapterFile, source); state.configuration.providers[0].adapter = {module: state.adapterFile};
  const report = await runProviders(state.configuration); assert.equal(report.status, 'failed'); assert.match(report.error ?? report.contracts[0].error, /changed/i);
});
test('cleanup errors invalidate passed checks', async t => {
  const {configuration} = await fixture(t, {adapter: 'export const createAdapter=()=>({value:42,dispose(){throw Error("cleanup failed");}});', checks});
  const report = await runProviders(configuration); assert.equal(report.status, 'failed'); assert.match(report.contracts[0].cleanupError, /cleanup failed/);
});
test('fresh output requirement protects prior evidence', async t => {
  const {configuration} = await fixture(t); await mkdir(configuration.output); await writeFile(path.join(configuration.output, 'report.json'), 'prior');
  await assert.rejects(() => runProviders(configuration), /must be fresh/); assert.equal(await readFile(path.join(configuration.output, 'report.json'), 'utf8'), 'prior');
});
test('CLI paths use cwd and configured fixture paths use the configuration directory', async t => {
  const {root} = await fixture(t); const filename = path.join(root, 'suite.json');
  await writeFile(filename, JSON.stringify({schema: 1, providers: [{path: 'package', fixtures: [{input: 'input.mkv', reference: 'input.f32'}]}]}));
  const resolved = await resolveConfig(parseArguments(['--config', filename, '--provider', 'cli-provider']));
  assert.equal(resolved.providers[0].path, path.join(root, 'package')); assert.equal(resolved.providers[1].path, path.resolve('cli-provider'));
  assert.equal(resolved.providers[0].fixtures[0].reference, path.join(root, 'input.f32'));
});
test('list mode never executes candidate or grants a passing report', async t => {
  const {configuration} = await fixture(t, {capability: 'audio.decode.ac3', profile: '48khz-fltp', code: 'throw Error("executed");'});
  configuration.list = true; const report = await runProviders(configuration); assert.equal(report.passed, false); assert.equal(report.contracts[0].status, 'planned');
});
test('argument and aggregate status handling retain failures and incompleteness', () => {
  assert.throws(() => parseArguments(['--provider']), /Missing value/); assert.throws(() => parseArguments(['--invalid']), /Unknown argument/);
  assert.equal(reportStatus([]), 'incomplete'); assert.equal(reportStatus([{status: 'passed'}, {status: 'blocked'}]), 'incomplete');
  assert.equal(reportStatus([{status: 'unsupported'}, {status: 'failed'}]), 'failed');
});

test('requesting packaged baseline retains missing comparisons as incomplete', async t => {
  const state = await fixture(t, {adapter, checks});
  const baselineState = await fixture(t);
  for (const name of ['package.json', 'provider-manifest.json']) {
    const filename = path.join(baselineState.candidate, name), metadata = JSON.parse(await readFile(filename));
    if (name === 'package.json') metadata.name = '@demuxe/provider-ffmpeg-asyncify';
    else metadata.package = '@demuxe/provider-ffmpeg-asyncify';
    await writeFile(filename, JSON.stringify(metadata));
  }
  state.configuration.baseline = baselineState.candidate;
  const report = await runProviders(state.configuration);
  assert.equal(report.contracts[0].status, 'passed'); assert.equal(report.status, 'incomplete');
  assert.equal(report.baseline.rows[0].status, 'blocked');
  assert.match(report.baseline.rows[0].reason, /No maintained packaged FFmpeg comparison/);
  assert.equal(report.baseline.package.name, '@demuxe/provider-ffmpeg-asyncify');
});
test('corrupt baseline fails input verification before candidate execution', async t => {
  const state = await fixture(t, {adapter, checks}), baseline = await fixture(t);
  state.configuration.baseline = baseline.candidate;
  await writeFile(path.join(baseline.candidate, 'runtime/entry.mjs'), 'corrupt');
  const report = await runProviders(state.configuration);
  assert.equal(report.status, 'failed'); assert.match(report.error, /artifact integrity/);
  assert.equal(report.contracts.length, 0);
});

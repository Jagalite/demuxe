// SPDX-License-Identifier: Apache-2.0
// Exercise the normal package runner with the maintained compiled container,
// including arbitrary replacement IDs, rather than a mock media implementation.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {sha, encoded} from './provider-conformance/package.mjs';
import {runProviders} from '../scripts/test-providers.mjs';

const home = path.resolve('build/provider-conformance-installed', Date.now().toString());
const candidate = path.join(home, 'candidate'); await mkdir(candidate, {recursive: true});
const outputs = JSON.parse(execFileSync(process.execPath, ['scripts/compile-component-providers.mjs', 'container'], {maxBuffer: 16 * 1024 * 1024}));
const artifacts = {}, assets = [], licenses = {};
for (const [name, item] of Object.entries(outputs)) {
  const relative = 'runtime/' + name, target = path.join(candidate, relative), bytes = Buffer.from(item.data);
  await mkdir(path.dirname(target), {recursive: true}); await writeFile(target, bytes);
  artifacts[relative] = sha(bytes); licenses[relative] = ['Apache-2.0'];
  assets.push({id: name, path: name, bytes: bytes.length, sha256: sha(bytes), dependencies: []});
}
// Model the compiled import graph instead of declaring every transitive file
// as a root asset (provider facts admit at most 64 roots).
const {default: ts} = await import('typescript');
for (const asset of assets) {
  if (!asset.path.endsWith('.js')) continue;
  const ast = ts.createSourceFile(asset.path, Buffer.from(outputs[asset.path].data).toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const dependencies = [];
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) dependencies.push(node.moduleSpecifier.text);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  asset.dependencies = [...new Set(dependencies.filter(name=>name.startsWith('.')).map(name=>path.posix.normalize(path.posix.join(path.posix.dirname(asset.path),name))))];
  assert.ok(asset.dependencies.every(name=>Object.hasOwn(outputs,name)), 'Missing compiled import');
}
const roots = assets.filter(asset=>asset.path.endsWith('/provider-container/src/matroska.js')||asset.path.endsWith('/provider-container/src/fmp4.js')).map(asset=>asset.id);
assert.equal(roots.length,2);
const version = JSON.parse(await readFile('package.json')).version, name = '@example/provider-container-candidate';
const identity = 'sha256:' + sha(encoded(artifacts));
const provides = [{id: 'replacement-container', implementationIdentity: identity, packageName: name,
  technology: 'javascript', delivery: ['optional-assets'], assetIds: roots,
  offers: [{capability: 'container.read.matroska', version: 1, profile: 'finite-clear-av'},
    {capability: 'container.mux.fmp4', version: 1, profile: 'explicit-timeline-av'}]}];
await writeFile(path.join(candidate, 'package.json'), JSON.stringify({name, version, type: 'module', license: 'Apache-2.0', peerDependencies: {demuxe: version}}));
await writeFile(path.join(candidate, 'provider-manifest.json'), JSON.stringify({schema: 1, providerContractVersion: 1, package: name, version,
  compatibleCore: version, artifacts, assets, provides}));
await writeFile(path.join(candidate, 'LICENSE'), await readFile('LICENSE'));
licenses['LICENSE'] = ['Apache-2.0']; licenses['package.json'] = ['Apache-2.0']; licenses['provider-manifest.json'] = ['Apache-2.0'];
await writeFile(path.join(candidate, 'license-map.json'), JSON.stringify(licenses));
const configuration = {providers: [{path: candidate}], output: path.join(home, 'evidence'), timeout: 120000, customSuites: []};
const report = await runProviders(configuration);
assert.equal(report.passed, true, JSON.stringify(report.contracts));
assert.equal(report.contracts.length, 2); assert.ok(report.contracts.every(row => row.providerId === 'replacement-container'));
console.log('Installed source candidate passed: ' + path.join(configuration.output, 'report.json'));

// A writer-only replacement may use our fixture reader for mux assertions.
// It must never receive reader conformance from that harness implementation.
const manifestPath = path.join(candidate, 'provider-manifest.json'), manifest = JSON.parse(await readFile(manifestPath));
const readerNames = Object.keys(manifest.artifacts).filter(name => name.endsWith('/matroska.js') || name.endsWith('/matroska.d.ts'));
for (const filename of readerNames) delete manifest.artifacts[filename];
manifest.assets = manifest.assets.filter(asset => !readerNames.includes('runtime/' + asset.path));
manifest.provides[0].assetIds = manifest.provides[0].assetIds.filter(id => !readerNames.includes('runtime/' + id));
for (const asset of manifest.assets) asset.dependencies = asset.dependencies.filter(id => !readerNames.includes('runtime/' + id));
manifest.provides[0].implementationIdentity = 'sha256:' + sha(encoded(manifest.artifacts));
await writeFile(manifestPath, JSON.stringify(manifest));
for (const filename of readerNames) delete licenses[filename];
await writeFile(path.join(candidate, 'license-map.json'), JSON.stringify(licenses));
const missing = await runProviders({...configuration, output: path.join(home, 'writer-only-evidence')});
assert.equal(missing.passed, false); assert.equal(missing.status, 'incomplete');
assert.equal(missing.contracts.find(row => row.capability === 'container.read.matroska').status, 'blocked');
assert.equal(missing.contracts.find(row => row.capability === 'container.mux.fmp4').status, 'passed');
console.log('Writer-only candidate correctly retains blocked reader coverage');

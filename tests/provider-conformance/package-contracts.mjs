// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, realpath, symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verifyProvider, checkUnchanged, sha, encoded} from './package.mjs';

async function candidate(t, mutate = () => {}) {
  const directory = await mkdtemp(path.join(await realpath(os.tmpdir()), 'demuxe-provider-schema-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const bytes = Buffer.from('export const candidate = true;\n');
  await mkdir(path.join(directory, 'runtime/modules'), {recursive: true});
  await writeFile(path.join(directory, 'runtime/modules/entry.mjs'), bytes);
  const metadata = {name: '@replacement/audio-provider', version: '1.2.3-test.1', peerDependencies: {demuxe: '0.3.0-beta.4'}};
  const artifacts = {'runtime/modules/entry.mjs': sha(bytes)};
  const identity = 'sha256:' + sha(encoded(artifacts));
  const manifest = {schema: 1, providerContractVersion: 1, package: metadata.name, version: metadata.version,
    compatibleCore: metadata.peerDependencies.demuxe, artifacts,
    assets: [{id: 'replacement:entry', path: 'modules/entry.mjs', sha256: sha(bytes), bytes: bytes.length, dependencies: []}],
    provides: [{id: 'replacement/audio', implementationIdentity: identity, packageName: metadata.name, technology: 'javascript',
      delivery: ['optional-assets'], assetIds: ['replacement:entry'], offers: [{capability: 'new.custom.capability', version: 2, profile: 'new-profile'}]}]};
  mutate({metadata, manifest});
  await writeFile(path.join(directory, 'package.json'), JSON.stringify(metadata));
  await writeFile(path.join(directory, 'provider-manifest.json'), JSON.stringify(manifest));
  return directory;
}

test('arbitrary package namespace and unknown contracts retain verified identity', async t => {
  const directory = await candidate(t);
  const provider = await verifyProvider(directory, '0.3.0-beta.4');
  assert.equal(provider.name, '@replacement/audio-provider');
  assert.deepEqual(provider.artifactPaths(provider.manifest.provides[0]), ['modules/entry.mjs']);
  await checkUnchanged(provider);
  await writeFile(path.join(directory, 'runtime/modules/entry.mjs'), 'changed');
  await assert.rejects(() => checkUnchanged(provider), /changed during testing/);
});

const malformed = [
  ['missing equal metadata values', ({metadata, manifest}) => {delete metadata.name; delete manifest.package;}],
  ['missing equal version values', ({metadata, manifest}) => {delete metadata.version; delete manifest.version;}],
  ['missing equal core values', ({metadata, manifest}) => {delete metadata.peerDependencies.demuxe; delete manifest.compatibleCore;}],
  ['invalid package namespace', ({metadata, manifest}) => {metadata.name = manifest.package = '../outside';}],
  ['version range instead of exact version', ({metadata, manifest}) => {metadata.version = manifest.version = '^1.2.3';}],
  ['unknown technology', ({manifest}) => {manifest.provides[0].technology = 'native-magic';}],
  ['unknown delivery', ({manifest}) => {manifest.provides[0].delivery = ['optional-assets', 'other'];}],
  ['duplicate delivery', ({manifest}) => {manifest.provides[0].delivery = ['optional-assets', 'optional-assets'];}],
  ['unbound application build', ({manifest}) => {manifest.provides[0].delivery.push('application-bundle');}],
  ['native missing browser delivery', ({manifest}) => {manifest.provides[0].technology = 'browser-native';}],
  ['assets without optional delivery', ({manifest}) => {manifest.provides[0].delivery = ['application-bundle']; manifest.provides[0].applicationBuild = 'app-v1';}],
  ['unsafe provider identifier', ({manifest}) => {manifest.provides[0].id = 'bad id';}],
  ['unsafe asset identifier', ({manifest}) => {manifest.assets[0].id = 'bad id';}],
  ['unsafe asset path', ({manifest}) => {manifest.assets[0].path = '../entry.mjs';}],
  ['duplicate provider assets', ({manifest}) => {manifest.provides[0].assetIds.push('replacement:entry');}],
  ['duplicate dependencies', ({manifest}) => {manifest.assets[0].dependencies = ['missing', 'missing'];}],
  ['unknown dependency', ({manifest}) => {manifest.assets[0].dependencies = ['missing'];}],
  ['cyclic dependency', ({manifest}) => {manifest.assets[0].dependencies = ['replacement:entry'];}],
  ['fractional byte size', ({manifest}) => {manifest.assets[0].bytes = 0.5;}],
  ['oversized byte size', ({manifest}) => {manifest.assets[0].bytes = 512 * 1024 * 1024 + 1;}],
  ['wrong package fact', ({manifest}) => {manifest.provides[0].packageName = '@another/provider';}],
  ['duplicate capability offer', ({manifest}) => {manifest.provides[0].offers.push({...manifest.provides[0].offers[0]});}],
];
for (const [name, mutate] of malformed) test('rejects ' + name, async t => {
  const directory = await candidate(t, mutate);
  await assert.rejects(() => verifyProvider(directory));
});

test('declared license files must exist', async t => {
  const directory = await candidate(t, ({metadata}) => {metadata.files = ['LICENSE', 'license-map.json'];});
  await assert.rejects(() => verifyProvider(directory), /ENOENT/);
});
test('license map retains source files and requires all runtime entries', async t => {
  const directory = await candidate(t, ({metadata}) => {metadata.files = ['LICENSE', 'license-map.json'];});
  await writeFile(path.join(directory, 'LICENSE'), 'Candidate test license text');
  await writeFile(path.join(directory, 'license-map.json'), JSON.stringify({'LICENSE': ['Apache-2.0']}));
  await assert.rejects(() => verifyProvider(directory), /missing license entry/);
  await writeFile(path.join(directory, 'license-map.json'), JSON.stringify({'LICENSE': ['Apache-2.0'], 'runtime/modules/entry.mjs': ['Apache-2.0']}));
  const provider = await verifyProvider(directory);
  assert.ok(provider.inputs.LICENSE && provider.inputs['license-map.json']);
  await writeFile(path.join(directory, 'LICENSE'), 'Changed license text');
  await assert.rejects(() => checkUnchanged(provider), /changed during testing/);
});
test('rejects symlinked runtime artifacts before execution', async t => {
  const directory = await candidate(t);
  await writeFile(path.join(directory, 'outside.mjs'), 'export const candidate = true;\n');
  await rm(path.join(directory, 'runtime/modules/entry.mjs'));
  await symlink(path.join(directory, 'outside.mjs'), path.join(directory, 'runtime/modules/entry.mjs'));
  await assert.rejects(() => verifyProvider(directory), /Symlinked package artifact/);
});

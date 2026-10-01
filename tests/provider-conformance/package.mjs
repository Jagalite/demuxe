// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, lstat} from 'node:fs/promises';
import path from 'node:path';

export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sort = value => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value;
export const encoded = value => Buffer.from((JSON.stringify(sort(value), null, 2) + '\n')
  .replace(/[\u007f-\uffff]/g, character => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0')));
export const contractKey = offer => JSON.stringify([offer.capability, offer.version, offer.profile]);
const object = (value, label) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Invalid ' + label);
  return value;
};
const text = (value, label) => {
  assert.ok(typeof value === 'string' && value.length > 0 && value.length <= 512, 'Invalid ' + label);
  return value;
};
const identifier = (value, label) => {
  assert.match(text(value, label), /^[a-zA-Z0-9][a-zA-Z0-9._:/@+-]*$/, 'Invalid ' + label);
  return value;
};
const packageName = (value, label) => {
  assert.match(text(value, label), /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/, 'Invalid ' + label);
  return value;
};
const version = (value, label) => {
  assert.match(text(value, label), /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/, 'Invalid ' + label);
  return value;
};
const uniqueList = (value, limit, label) => {
  assert.ok(Array.isArray(value) && value.length <= limit, 'Invalid ' + label);
  assert.equal(new Set(value).size, value.length, 'Duplicate ' + label);
  return value;
};
export function safePath(name) {
  text(name, 'package path');
  assert.ok(!path.isAbsolute(name) && !name.split('/').some(part => !part || part === '.' || part === '..'
    || !/^[a-zA-Z0-9_.-]+$/.test(part)), 'Unsafe package path: ' + name);
  return name;
}
export async function packageFile(root, name) {
  root = path.resolve(root);
  for (let current = root; ; current = path.dirname(current)) {
    assert.equal((await lstat(current)).isSymbolicLink(), false, 'Symlinked package root: ' + current);
    if (path.dirname(current) === current) break;
  }
  let file = root;
  for (const part of safePath(name).split('/')) {
    file = path.join(file, part);
    assert.equal((await lstat(file)).isSymbolicLink(), false, 'Symlinked package artifact: ' + name);
  }
  assert.equal((await lstat(file)).isFile(), true, 'Expected package file: ' + name);
  return readFile(file);
}

/** Verify actual package bytes and deployment structure. Unknown capability
 * tuples remain declarations that the runner must report as unsupported. */
export async function verifyProvider(directory, coreVersion) {
  const root = path.resolve(directory), inputs = {};
  const read = async name => {const bytes = await packageFile(root, name); inputs[name] = {sha256: sha(bytes), bytes: bytes.length}; return bytes;};
  const metadata = object(JSON.parse(await read('package.json')), 'package metadata');
  const manifest = object(JSON.parse(await read('provider-manifest.json')), 'provider manifest');
  packageName(metadata.name, 'package name'); packageName(manifest.package, 'manifest package name');
  version(metadata.version, 'package version'); version(manifest.version, 'manifest version');
  version(manifest.compatibleCore, 'compatible core version'); version(metadata.peerDependencies?.demuxe, 'core peer dependency');
  assert.equal(manifest.schema, 1, 'Unsupported manifest schema');
  assert.equal(manifest.providerContractVersion, 1, 'Unsupported provider contract');
  assert.equal(manifest.package, metadata.name, 'Package/manifest name mismatch');
  assert.equal(manifest.version, metadata.version, 'Package/manifest version mismatch');
  assert.equal(metadata.peerDependencies.demuxe, manifest.compatibleCore, 'Core compatibility mismatch');
  if (coreVersion !== undefined) {version(coreVersion, 'requested core version'); assert.equal(manifest.compatibleCore, coreVersion, 'Provider/core version mismatch');}
  object(manifest.artifacts, 'artifact inventory');
  const artifacts = Object.entries(manifest.artifacts);
  assert.ok(artifacts.length && artifacts.length <= 20000, 'Empty/excessive artifact inventory');
  for (const [name, digest] of artifacts) {
    assert.ok(name.startsWith('runtime/'), 'Artifact outside runtime/');
    assert.match(digest, /^[a-f0-9]{64}$/);
    assert.equal(sha(await read(name)), digest, 'Provider artifact integrity mismatch: ' + name);
  }
  const identity = 'sha256:' + sha(encoded(manifest.artifacts));
  assert.ok(Array.isArray(manifest.assets) && manifest.assets.length === artifacts.length && manifest.assets.length <= 256, 'Incomplete/excessive asset inventory');
  const assets = new Map(), paths = new Set();
  for (const asset of manifest.assets) {
    object(asset, 'asset'); safePath(asset.path); identifier(asset.id, 'asset id');
    assert.ok(!assets.has(asset.id), 'Duplicate asset id');
    assert.ok(!paths.has(asset.path), 'Duplicate asset path'); paths.add(asset.path);
    assert.equal(asset.sha256, manifest.artifacts['runtime/' + asset.path], 'Asset hash mismatch');
    assert.ok(Number.isSafeInteger(asset.bytes) && asset.bytes >= 0 && asset.bytes <= 512 * 1024 * 1024, 'Invalid asset size');
    assert.equal(asset.bytes, inputs['runtime/' + asset.path]?.bytes, 'Asset size mismatch');
    uniqueList(asset.dependencies ?? [], 64, 'asset dependencies').forEach(id => identifier(id, 'dependency id'));
    assets.set(asset.id, asset);
  }
  const closures = new Map();
  const closure = (id, seen = new Set()) => {
    assert.ok(assets.has(id), 'Unknown asset dependency: ' + id);
    assert.ok(!seen.has(id), 'Cyclic asset dependency: ' + id);
    if (closures.has(id)) return closures.get(id);
    const next = new Set([...seen, id]);
    const result = [...new Set([...(assets.get(id).dependencies ?? []).flatMap(dependency => closure(dependency, next)), id])];
    closures.set(id, result); return result;
  };
  for (const id of assets.keys()) closure(id);
  assert.ok(Array.isArray(manifest.provides) && manifest.provides.length && manifest.provides.length <= 256, 'Missing/excessive provider facts');
  const ids = new Set();
  for (const fact of manifest.provides) {
    object(fact, 'provider fact'); identifier(fact.id, 'provider id');
    assert.ok(!ids.has(fact.id), 'Duplicate provider id'); ids.add(fact.id);
    identifier(fact.implementationIdentity, 'implementation identity');
    assert.equal(fact.implementationIdentity, identity, 'Provider implementation identity mismatch');
    assert.ok(['browser-native', 'javascript', 'wasm', 'mixed'].includes(fact.technology), 'Invalid provider technology');
    const delivery = uniqueList(fact.delivery, 3, 'provider delivery');
    assert.ok(delivery.length && delivery.every(value => ['browser', 'application-bundle', 'optional-assets'].includes(value)), 'Invalid provider delivery');
    uniqueList(fact.assetIds ?? [], 64, 'provider asset ids').forEach(id => identifier(id, 'provider asset id'));
    assert.ok(fact.assetIds?.length, 'Missing provider assets');
    assert.ok(delivery.includes('optional-assets'), 'Provider assets require optional-assets delivery');
    if (delivery.includes('application-bundle')) identifier(fact.applicationBuild, 'application build');
    if (fact.technology === 'browser-native') assert.ok(delivery.includes('browser'), 'Native provider must declare browser delivery');
    if (fact.packageName !== undefined) {packageName(fact.packageName, 'provider package name'); assert.equal(fact.packageName, metadata.name, 'Provider package name mismatch');}
    fact.assetIds.forEach(id => closure(id));
    assert.ok(Array.isArray(fact.offers) && fact.offers.length && fact.offers.length <= 64, 'Missing/excessive offers');
    const offers = new Set();
    for (const offer of fact.offers) {
      object(offer, 'capability offer'); identifier(offer.capability, 'capability'); text(offer.profile, 'capability profile');
      assert.ok(Number.isSafeInteger(offer.version) && offer.version > 0, 'Invalid capability version');
      assert.ok(!offers.has(contractKey(offer)), 'Duplicate capability offer'); offers.add(contractKey(offer));
    }
  }
  // Validate and retain present or explicitly declared licensing metadata;
  // structural correctness does not establish license/release qualification.
  const declares = name => Array.isArray(metadata.files) && metadata.files.includes(name);
  const exists = async name => {try {await lstat(path.join(root, name)); return true;} catch (error) {if (error.code === 'ENOENT') return false; throw error;}};
  if (declares('LICENSE') || await exists('LICENSE')) assert.ok((await read('LICENSE')).length, 'Empty package LICENSE');
  if (declares('license-map.json') || await exists('license-map.json')) {
    const licenses = object(JSON.parse(await read('license-map.json')), 'license map');
    assert.ok(Object.keys(licenses).length, 'Empty license map');
    for (const [name, values] of Object.entries(licenses)) {
      safePath(name); uniqueList(values, 64, 'file licenses');
      assert.ok(values.length, 'Missing file licenses: ' + name); values.forEach(value => text(value, 'license identifier'));
      if (!inputs[name]) await read(name);
    }
    for (const [name] of artifacts) assert.ok(Object.hasOwn(licenses, name), 'Runtime artifact missing license entry: ' + name);
  }
  return {root, name: metadata.name, version: metadata.version, identity, manifest, inputs,
    artifactPaths: fact => [...new Set(fact.assetIds.flatMap(id => closure(id)).map(id => assets.get(id).path))]};
}

export async function checkUnchanged(provider) {
  for (const [name, record] of Object.entries(provider.inputs)) {
    assert.equal(sha(await packageFile(provider.root, name)), record.sha256, 'Package changed during testing: ' + name);
  }
}

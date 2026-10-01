// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, lstat, realpath, rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {collectHarnessInputs} from './harness-inputs.mjs';
import {sha} from './package.mjs';

const exec = promisify(execFile);
async function fixture(t) {
  const root = await mkdtemp(path.join(await realpath(os.tmpdir()), 'demuxe-native-graph-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const marker = path.join(root, 'executed.txt');
  const put = async (name, contents) => {
    const filename = path.join(root, name);
    await mkdir(path.dirname(filename), {recursive: true});
    await writeFile(filename, typeof contents === 'string' ? contents : JSON.stringify(contents));
    return filename;
  };
  const esm = value => `import {appendFileSync} from 'node:fs';appendFileSync(${JSON.stringify(marker)},${JSON.stringify(value + '\n')});export const value=${value};`;
  const cjs = value => `require('node:fs').appendFileSync(${JSON.stringify(marker)},${JSON.stringify(value + '\n')});module.exports={value:${value}};`;
  const collect = async entry => {
    const inputs = await collectHarnessInputs(entry);
    await assert.rejects(() => lstat(marker), {code: 'ENOENT'}, 'Discovery evaluated test code');
    return inputs;
  };
  return {root, marker, put, esm, cjs, collect};
}
async function actual(entry) {
  const source = `const m=await import(${JSON.stringify(pathToFileURL(entry).href)});console.log(JSON.stringify(m.values??m.value??m.default?.values??m.default?.value??m.default));`;
  return JSON.parse((await exec(process.execPath, ['--input-type=module', '--eval', source], {timeout: 10000})).stdout);
}
async function included(inputs, ...filenames) {
  for (const filename of filenames) assert.equal(inputs[filename], sha(await readFile(filename)), 'Missing executed input: ' + filename);
}

test('conditional exports record native import/require branches and ignore module branch', async t => {
  const f = await fixture(t);
  const metadata = await f.put('node_modules/dual/package.json', {name: 'dual', version: '1.0.0', type: 'module',
    exports: {module: './bundler.mjs', import: './native.mjs', require: './native.cjs'}});
  const bundler = await f.put('node_modules/dual/bundler.mjs', f.esm(99));
  const esm = await f.put('node_modules/dual/native.mjs', f.esm(42));
  const cjs = await f.put('node_modules/dual/native.cjs', f.cjs(7));
  const entry = await f.put('adapter.mjs', `import {value} from 'dual';import {createRequire} from 'node:module';const load=createRequire(import.meta.url);export const values=[value,load('dual').value];`);
  const inputs = await f.collect(entry);
  assert.deepEqual(await actual(entry), [42, 7]);
  await included(inputs, entry, metadata, esm, cjs);
  assert.equal(inputs[bundler], undefined, 'Bundler-only branch recorded as native code');
});

test('module-sync conditional exports follow the running Node resolver', async t => {
  const f = await fixture(t);
  const metadata = await f.put('node_modules/sync/package.json', {name: 'sync', version: '1.0.0', type: 'module',
    exports: {'module-sync': './sync.mjs', import: './import.mjs', require: './require.cjs', default: './default.mjs'}});
  const files = new Map();
  for (const [name, value] of [['sync.mjs', 10], ['import.mjs', 20], ['require.cjs', 30], ['default.mjs', 40]]) {
    files.set(value, await f.put('node_modules/sync/' + name, name.endsWith('.cjs') ? f.cjs(value) : f.esm(value)));
  }
  const entry = await f.put('adapter.mjs', `import {value} from 'sync';import {createRequire} from 'node:module';const load=createRequire(import.meta.url);export const values=[value,load('sync').value];`);
  const inputs = await f.collect(entry), selected = await actual(entry);
  await included(inputs, entry, metadata, ...selected.map(value => files.get(value)));
  for (const [value, filename] of files) if (!selected.includes(value)) assert.equal(inputs[filename], undefined, 'Unselected export condition recorded');
});

test('legacy main wins over module and reaches hidden CommonJS descendants', async t => {
  const f = await fixture(t);
  const metadata = await f.put('node_modules/legacy/package.json', {name: 'legacy', version: '1.0.0', main: './entry.cjs', module: './bundler.mjs'});
  const main = await f.put('node_modules/legacy/entry.cjs', `module.exports=require('./hidden.cjs');`);
  const hidden = await f.put('node_modules/legacy/hidden.cjs', f.cjs(12));
  const bundler = await f.put('node_modules/legacy/bundler.mjs', f.esm(99));
  const entry = await f.put('adapter.mjs', `import dependency from 'legacy';export const value=dependency.value;`);
  const inputs = await f.collect(entry);
  assert.equal(await actual(entry), 12);
  await included(inputs, entry, metadata, main, hidden);
  assert.equal(inputs[bundler], undefined);
});

test('legacy main outside package directory retains governing package metadata', async t => {
  const f = await fixture(t);
  const metadata = await f.put('node_modules/outside/package.json', {name: 'outside', version: '1.0.0', main: '../shared/entry.cjs', module: './ignored.mjs'});
  const main = await f.put('node_modules/shared/entry.cjs', f.cjs(17));
  const ignored = await f.put('node_modules/outside/ignored.mjs', f.esm(99));
  const entry = await f.put('adapter.mjs', `import dependency from 'outside';export const value=dependency.value;`);
  const inputs = await f.collect(entry);
  assert.equal(await actual(entry), 17);
  await included(inputs, entry, metadata, main);
  assert.equal(inputs[ignored], undefined);
});

test('CommonJS require follows require exports and extension/directory fallback', async t => {
  const f = await fixture(t);
  const metadata = await f.put('node_modules/required/package.json', {name: 'required', version: '1.0.0', exports: {import: './import.mjs', require: './require.cjs'}});
  const imported = await f.put('node_modules/required/import.mjs', f.esm(99));
  const required = await f.put('node_modules/required/require.cjs', `module.exports=require('./hidden');`);
  const hidden = await f.put('node_modules/required/hidden/index.js', f.cjs(21));
  const entry = await f.put('adapter.cjs', `module.exports=require('required');`);
  const inputs = await f.collect(entry);
  assert.equal(await actual(entry), 21);
  await included(inputs, entry, metadata, required, hidden);
  assert.equal(inputs[imported], undefined);
});

test('renamed and namespace createRequire aliases preserve native dependency closure', async t => {
  const f = await fixture(t);
  const first = await f.put('first.cjs', f.cjs(2)), second = await f.put('second.cjs', f.cjs(3));
  const entry = await f.put('adapter.mjs', `import {createRequire as makeLoader} from 'node:module';import * as mod from 'node:module';const left=makeLoader(import.meta.url);const right=mod.createRequire(import.meta.url);export const values=[left('./first.cjs').value,right('./second.cjs').value];`);
  const inputs = await f.collect(entry);
  assert.deepEqual(await actual(entry), [2, 3]);
  await included(inputs, entry, first, second);
});

test('literal createRequire base resolves relative to its declared base', async t => {
  const f = await fixture(t);
  const hidden = await f.put('other/hidden.cjs', f.cjs(25));
  const base = path.join(f.root, 'other', 'anchor.cjs');
  const entry = await f.put('adapter.mjs', `import {createRequire} from 'node:module';const load=createRequire(${JSON.stringify(pathToFileURL(base).href)});export const value=load('./hidden.cjs').value;`);
  const inputs = await f.collect(entry);
  assert.equal(await actual(entry), 25);
  await included(inputs, entry, hidden);
});

test('direct CommonJS require alias descendants remain recorded', async t => {
  const f = await fixture(t), hidden = await f.put('hidden.cjs', f.cjs(31));
  const entry = await f.put('adapter.cjs', `const load=require;module.exports=load('./hidden.cjs');`);
  const inputs = await f.collect(entry);
  assert.equal(await actual(entry), 31);
  await included(inputs, entry, hidden);
});

test('computed createRequire alias specifiers reject without executing code', async t => {
  const f = await fixture(t);
  await f.put('hidden.cjs', f.cjs(41));
  const entry = await f.put('adapter.mjs', `import {createRequire as makeLoader} from 'node:module';const load=makeLoader(import.meta.url);const name='./hidden.cjs';export const value=load(name).value;`);
  await assert.rejects(() => collectHarnessInputs(entry), /Computed harness import/);
  await assert.rejects(() => lstat(f.marker), {code: 'ENOENT'});
});

test('computed createRequire bases reject without executing code', async t => {
  const f = await fixture(t);
  const entry = await f.put('adapter.mjs', `import {createRequire} from 'node:module';const base=import.meta.url;const load=createRequire(base);export const value=load('./hidden.cjs').value;`);
  await assert.rejects(() => collectHarnessInputs(entry), /Computed harness require base/);
  await assert.rejects(() => lstat(f.marker), {code: 'ENOENT'});
});

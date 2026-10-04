// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

const shakaAssets=['web/vendor/shaka-player.js','web/vendor/shaka-player.transmuxer-worker.js'];
async function optionalShakaFixture(t,adaptiveStreaming){
  const root=await realpath(await mkdtemp(path.join(tmpdir(),'demuxe-optional-shaka-')));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const pkg=path.join(root,'package'),dest=path.join(root,'deployed'),files={};
  async function put(name,bytes){
    await mkdir(path.dirname(path.join(pkg,name)),{recursive:true});
    await writeFile(path.join(pkg,name),bytes);files[name]={bytes:bytes.length,sha256:hash(bytes)};
  }
  for(const name of ['bin/demuxe.mjs','web/engine-hybrid/player.wasm','web/engine-software-yuv/player.wasm','web/engine-software-full/player.wasm','web/engine-remux/remux.wasm','fixtures/DejaVuSans.ttf','LICENSE','third_party/notices.json','third_party/shaka-player.json',...(adaptiveStreaming===null?[]:shakaAssets)]){
    await put(name,name==='bin/demuxe.mjs'?await readFile(new URL('../bin/demuxe.mjs',import.meta.url)):Buffer.from(name));
  }
  await writeFile(path.join(pkg,'package.json'),JSON.stringify({name:'demuxe',version:'test',type:'module'}));
  async function release(inclusion=adaptiveStreaming){
    await put('web/generated/internal/provider-build.js',Buffer.from(`export const bundledShakaIncluded = ${inclusion!==null};\n`));
    await writeFile(path.join(pkg,'release-manifest.json'),JSON.stringify({schema:1,version:'test',publicModes:['native','hybrid','software'],adaptiveStreaming:inclusion,files}));
  }
  await release();
  return {pkg,dest,files,release,run:(...args)=>execFileSync(process.execPath,[path.join(pkg,'bin/demuxe.mjs'),'copy-assets',dest,...args],{stdio:'pipe'})};
}

test('explicitly omitted Shaka deploys in standard and full asset sets',async t=>{
  const f=await optionalShakaFixture(t,null);
  for(const args of [[],['--full']]){
    f.run(...args);
    const record=JSON.parse(await readFile(path.join(f.dest,'demuxe-runtime.json')));
    for(const name of shakaAssets){assert.ok(!record.files[name]);await assert.rejects(readFile(path.join(f.dest,name)),{code:'ENOENT'});}
    assert.match(await readFile(path.join(f.dest,'web/generated/internal/provider-build.js'),'utf8'),/bundledShakaIncluded = false/);
  }
});

test('upgrading to omitted Shaka retires only unchanged assets from the previous deployment',async t=>{
  const f=await optionalShakaFixture(t,{backend:'shaka-mse'});f.run();
  await writeFile(path.join(f.dest,'host.txt'),'consumer');
  await writeFile(path.join(f.dest,shakaAssets[1]),'consumer edit');
  for(const name of shakaAssets)delete f.files[name];
  await f.release(null);f.run();
  await assert.rejects(readFile(path.join(f.dest,shakaAssets[0])),{code:'ENOENT'});
  assert.equal(await readFile(path.join(f.dest,shakaAssets[1]),'utf8'),'consumer edit');
  assert.equal(await readFile(path.join(f.dest,'host.txt'),'utf8'),'consumer');
  const record=JSON.parse(await readFile(path.join(f.dest,'demuxe-runtime.json')));
  for(const name of shakaAssets)assert.ok(!record.files[name]);
});

for(const [label,inclusion] of [['included',{backend:'shaka-mse'}],['legacy',undefined]]){
  test(`${label} Shaka rejects missing inventory entries before deployment`,async t=>{
    const f=await optionalShakaFixture(t,inclusion);
    for(const name of shakaAssets){
      const entry=f.files[name];delete f.files[name];await f.release();
      assert.throws(()=>f.run(),/Required runtime asset absent/);
      await assert.rejects(readFile(path.join(f.dest,'demuxe-runtime.json')),{code:'ENOENT'});
      f.files[name]=entry;
    }
  });
}

test('included Shaka rejects corrupt and physically missing assets before deployment',async t=>{
  const f=await optionalShakaFixture(t,{backend:'shaka-mse'});
  await writeFile(path.join(f.pkg,shakaAssets[0]),'corrupt');
  assert.throws(()=>f.run(),/Package asset hash mismatch/);
  await rm(path.join(f.pkg,shakaAssets[0]));
  assert.throws(()=>f.run(),/Missing package asset/);
  await assert.rejects(readFile(path.join(f.dest,'demuxe-runtime.json')),{code:'ENOENT'});
});

test('standard/full deployment preserves hashes, paths and safe upgrades', async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'demuxe-assets-')));
  try {
    const pkg = path.join(root, 'package'), dest = path.join(root, 'custom folder/runtime-v1');
    const files = {};
    for (const name of ['bin/demuxe.mjs', 'web/engine-hybrid/player.wasm', 'web/engine-software-yuv/player.wasm', 'web/engine-software-full/player.wasm', 'web/engine-software-full/player.mjs', 'web/engine-remux/remux.wasm', 'web/private-remux.js', 'web/private-mpv.js', 'web/private-mpv/LICENSE.txt', ...['jspi','asyncify'].flatMap(backend=>['subtitles','audio'].flatMap(profile=>['service.mjs','service.wasm','manifest.json'].map(file=>`web/engine-mpv-${profile}-${backend}/${file}`))), 'web/private-ffmpeg/bridge.js', 'web/engine-remux-jspi/remux.wasm', 'web/engine-remux-asyncify/remux.wasm', 'web/engine-adaptation-jspi/remux.wasm', 'web/engine-adaptation-asyncify/remux.wasm', 'web/generated/internal/runtime-worker.js', 'fixtures/DejaVuSans.ttf', 'LICENSE', 'third_party/notices.json', 'web/vendor/shaka-player.js', 'web/vendor/shaka-player.transmuxer-worker.js', 'third_party/shaka-player.json']) {
      const bytes = name === 'bin/demuxe.mjs' ? await readFile(new URL('../bin/demuxe.mjs', import.meta.url)) : Buffer.from(name);
      await mkdir(path.dirname(path.join(pkg, name)), {recursive:true});
      await writeFile(path.join(pkg, name), bytes);
      files[name] = {bytes:bytes.length, sha256:hash(bytes)};
    }
    await writeFile(path.join(pkg, 'package.json'), JSON.stringify({name:'demuxe', version:'test'}));
    const release = JSON.stringify({schema:1, version:'test', publicModes:['native','hybrid','software'], files});
    await writeFile(path.join(pkg, 'release-manifest.json'), release);
    const run = (...args) => execFileSync(process.execPath, [path.join(pkg, 'bin/demuxe.mjs'), 'copy-assets', ...args], {stdio:'pipe'});
    const manifest = async () => JSON.parse(await readFile(path.join(dest, 'demuxe-runtime.json')));
    run(dest);
    let record = await manifest();
    assert.equal(record.assetSet, 'standard');
    assert.equal(record.packageManifestSHA256, hash(release));
    assert.ok(record.files['web/engine-software-yuv/player.wasm']);
    for(const backend of ['jspi','asyncify'])for(const profile of ['remux','adaptation'])assert.ok(record.files[`web/engine-${profile}-${backend}/remux.wasm`]);
    for(const backend of ['jspi','asyncify'])for(const profile of ['subtitles','audio'])assert.ok(record.files[`web/engine-mpv-${profile}-${backend}/service.wasm`]);
    assert.ok(record.files['web/private-mpv/LICENSE.txt']);
    assert.ok(!record.files['web/engine-software-full/player.wasm']);
    await assert.rejects(readFile(path.join(dest, 'web/engine-software-full/player.wasm')), {code:'ENOENT'});
    for (const [name, expected] of Object.entries(record.files)) {
      assert.deepEqual(expected, files[name]);
      assert.equal(hash(await readFile(path.join(dest, name))), expected.sha256);
    }
    run('--full', dest);
    run(dest, '--full');
    record = await manifest();
    assert.equal(record.assetSet, 'full');
    assert.ok(record.files['web/engine-software-full/player.wasm']);
    await writeFile(path.join(dest, 'host.txt'), 'consumer');
    await writeFile(path.join(dest, 'web/engine-software-full/player.mjs'), 'consumer edit');
    run(dest);
    await assert.rejects(readFile(path.join(dest, 'web/engine-software-full/player.wasm')), {code:'ENOENT'});
    assert.equal(await readFile(path.join(dest, 'web/engine-software-full/player.mjs'), 'utf8'), 'consumer edit');
    assert.equal(await readFile(path.join(dest, 'host.txt'), 'utf8'), 'consumer');
    run(dest); // Idempotent standard copy.
    assert.throws(() => run(dest, '--unknown'), /Usage/);
    // Even omitted fallback assets are verified before a standard deployment.
    await writeFile(path.join(pkg, 'web/engine-software-full/player.wasm'), 'corrupt');
    assert.throws(() => run(path.join(root, 'invalid')), /hash mismatch/);
    await assert.rejects(readFile(path.join(root, 'invalid/demuxe-runtime.json')), {code:'ENOENT'});
  } finally { await rm(root, {recursive:true, force:true}); }
});

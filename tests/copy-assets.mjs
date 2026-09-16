import {test} from 'node:test';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,mkdir,symlink} from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';
const archive=path.resolve(process.env.BETA_ARCHIVE||'build/public-api-candidate-4/demuxe-0.3.0-beta.3.tgz');const root=await mkdtemp(path.resolve('build/copy-qualification-'));execFileSync('tar',['-xzf',archive,'-C',root]);const pkg=path.join(root,'package'),cli=path.join(pkg,'bin/demuxe.mjs');
const run=dest=>execFileSync(process.execPath,[cli,'copy-assets',dest],{encoding:'utf8',stdio:'pipe'});
const failure=dest=>{try{run(dest);assert.fail('Expected copy rejection');}catch(error){return String(error.stderr||error);}};
test('copy preserves unrelated files and is repeatable',async()=>{const dir=path.join(root,'success');await mkdir(dir);await writeFile(path.join(dir,'host.txt'),'owned by consumer');run(dir);run(dir);assert.equal(await readFile(path.join(dir,'host.txt'),'utf8'),'owned by consumer');const m=JSON.parse(await readFile(path.join(dir,'demuxe-runtime.json')));assert.ok(m.files['web/engine-hybrid/player.wasm']);assert.ok(m.files['third_party/notices.json']);});
test('copy refuses unrelated collisions and symlinks',async()=>{const dir=path.join(root,'collision');await mkdir(path.join(dir,'web'),{recursive:true});await writeFile(path.join(dir,'web/io-worker.js'),'owned by consumer');assert.match(failure(dir),/unrelated destination/);assert.equal(await readFile(path.join(dir,'web/io-worker.js'),'utf8'),'owned by consumer');const link=path.join(root,'symlink');await symlink(dir,link);assert.match(failure(link),/symlink/);});
test('copy rejects tampered and missing assets before writing runtime files',async()=>{const file=path.join(pkg,'web/io-worker.js'),original=await readFile(file);try{await writeFile(file,'corrupt');assert.match(failure(path.join(root,'tampered')),/hash mismatch/);}finally{await writeFile(file,original);}const manifestFile=path.join(pkg,'release-manifest.json'),before=await readFile(manifestFile);try{const m=JSON.parse(before);m.files['missing.js']={bytes:1,sha256:'bad'};await writeFile(manifestFile,JSON.stringify(m));assert.match(failure(path.join(root,'missing')),/Missing package asset/);}finally{await writeFile(manifestFile,before);}});
test('copy rejects incompatible package manifest version',async()=>{const file=path.join(pkg,'package.json'),before=await readFile(file);try{const p=JSON.parse(before);p.version='999.0.0';await writeFile(file,JSON.stringify(p));assert.match(failure(path.join(root,'incompatible')),/Incompatible package/);}finally{await writeFile(file,before);}});
test('packaged runtime contains no host build paths or private keys, including Wasm strings',async()=>{const manifest=JSON.parse(await readFile(path.join(pkg,'release-manifest.json')));for(const name of [...Object.keys(manifest.files),'release-manifest.json']){const text=(await readFile(path.join(pkg,name))).toString('latin1');assert.equal(/\/(?:Users|Volumes|private\/var)\//.test(text),false,'Host path in '+name);assert.equal(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text),false,'Private key in '+name);}});

test('optional source companions are listed and match their runtime manifests',async()=>{
 const sums=await readFile(path.join(path.dirname(archive),'SHA256SUMS'),'utf8');
 for(const engine of ['engine-adaptation','engine-ass']){
  let manifest;try{manifest=JSON.parse(await readFile(path.join(pkg,'web',engine,'manifest.json')));}catch(e){if(e.code==='ENOENT')continue;throw e;}
  const source=manifest.sourceCompanion,bytes=await readFile(path.join(path.dirname(archive),source.filename));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  assert.ok(sums.split('\n').includes(`${source.sha256}  ${source.filename}`),'Companion missing from SHA256SUMS: '+engine);
 }
});

test('clean ASS companion preserves the preferred sources recorded by the build',async()=>{
 let manifest;try{manifest=JSON.parse(await readFile(path.join(pkg,'web/engine-ass/manifest.json')));}catch(e){if(e.code==='ENOENT')return;throw e;}
 if(!manifest.sourceBuildVerification?.verified)return; // Historical reused-library packages have no clean-build claim.
 assert.equal(manifest.sourceBuildVerification.releaseQualified,false);
 const source=path.join(path.dirname(archive),manifest.sourceCompanion.filename);
 execFileSync('python3',['-c',`
import hashlib,json,sys,tarfile
with tarfile.open(sys.argv[1]) as archive:
 record=json.load(archive.extractfile('source-build.json'))
 count=0
 for name,digest in record['files'].items():
  if name.startswith('build/sources/'):
   target='libraries/'+name[len('build/sources/'):]
  elif name.startswith('scripts/') or name in ['sources.lock.json','toolchain.lock.json']:
   target='demuxe/'+name
  else: continue
  assert hashlib.sha256(archive.extractfile(target).read()).hexdigest()==digest,target
  count+=1
 assert count>0
 linked=json.load(archive.extractfile('build-manifest.json'))
 for suffix in ['native/subtitles/ass.c','scripts/link-native-ass.py']:
  expected=next(v['sha256'] for k,v in linked['files'].items() if k.endswith('/'+suffix))
  assert hashlib.sha256(archive.extractfile('demuxe/'+suffix).read()).hexdigest()==expected,suffix
`,source],{stdio:'pipe'});
});

test('clean preparation companion preserves all patched preferred sources and wrapper configuration',async()=>{
 let manifest;try{manifest=JSON.parse(await readFile(path.join(pkg,'web/engine-adaptation/manifest.json')));}catch(e){if(e.code==='ENOENT')return;throw e;}
 if(!manifest.sourceBuildVerification?.verified)return;
 assert.equal(manifest.sourceBuildVerification.releaseQualified,false);
 execFileSync('python3',['-c',`
import hashlib,json,sys,tarfile
with tarfile.open(sys.argv[1]) as archive:
 sources=json.load(archive.extractfile('preferred-source-hashes.json'))
 assert sources
 for name,digest in sources.items():
  assert hashlib.sha256(archive.extractfile('ffmpeg/'+name).read()).hexdigest()==digest,name
 linked=json.load(archive.extractfile('build-manifest.json'))
 for suffix in ['native/remux/remux.c','native/adaptation/flac.h','scripts/build-audio-adaptation.py']:
  expected=next(v['sha256'] for k,v in linked['files'].items() if k.endswith('/'+suffix))
  assert hashlib.sha256(archive.extractfile('demuxe/'+suffix).read()).hexdigest()==expected,suffix
 for suffix,target in [('ffmpeg/config.h','build/config.h'),('ffmpeg/config_components.h','build/config_components.h'),('ffmpeg/ffbuild/config.mak','build/config.mak')]:
  expected=next(v['sha256'] for k,v in linked['files'].items() if k.endswith('/'+suffix))
  assert hashlib.sha256(archive.extractfile(target).read()).hexdigest()==expected,target
`,path.join(path.dirname(archive),manifest.sourceCompanion.filename)],{stdio:'pipe'});
});

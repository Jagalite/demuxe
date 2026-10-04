// SPDX-License-Identifier: Apache-2.0
// Prepare a fresh installed-package smoke for the collaborative browser. The
// Shaka identity is admitted only in this test copy until evidence is reviewed.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,cp,rm,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './head-to-head/server.mjs';
const repo=path.resolve(import.meta.dirname,'..');
const work=await mkdtemp(path.join(repo,'build/shaka-provider-smoke-'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const run=(command,args,options={})=>execFileSync(command,args,{cwd:repo,stdio:'pipe',...options});
run('python3',['scripts/package-player-core.py','--output',path.join(work,'core-build')],{env:{...process.env,DEMUXE_PROVIDER_CANDIDATE:'1'}});
run('python3',['scripts/prepare-provider-package.py','--target','shaka','--output',path.join(work,'provider-build')]);
const coreAssembly=JSON.parse(await readFile(path.join(work,'core-build/assembly.json')));
const providerAssembly=JSON.parse(await readFile(path.join(work,'provider-build/assembly.json')));
for(const [name,archive] of [['core',coreAssembly.archive],['provider',providerAssembly.archive]]){
 await mkdir(path.join(work,name));run('tar',['-xzf',archive,'-C',path.join(work,name)]);
}
const core=path.join(work,'core/package'),provider=path.join(work,'provider/package');
const manifest=JSON.parse(await readFile(path.join(provider,'provider-manifest.json')));
const identity=manifest.provides[0].implementationIdentity;
const registry=JSON.parse(await readFile('licensing/provider-runtime-qualification.json'));
const file=path.join(core,'web/generated/internal/provider-build.js');
const before=await readFile(file);
const maintained=registry.providers['shaka-adaptive']!==undefined;
if(maintained)assert.equal(registry.providers['shaka-adaptive'],identity,'Installed provider differs from maintained Shaka identity');
const after=maintained?before:Buffer.from('// SPDX-License-Identifier: Apache-2.0\n// TEST COPY: bounded Shaka admission smoke, not production qualification.\nexport const providerDeploymentEnabled = true;\nexport const bundledShakaIncluded = false;\nexport const qualifiedProviderIdentities = Object.freeze('+JSON.stringify({...registry.providers,'shaka-adaptive':identity})+');\n');
await writeFile(file,after);
for(const name of ['included','omitted'])run('python3',['scripts/deploy-providers.py','--core',core,...(name==='included'?['--provider',provider]:[]),'--output',path.join(work,name)]);
for(const name of ['corrupt','missing'])await cp(path.join(work,'included'),path.join(work,name),{recursive:true});
await writeFile(path.join(work,'corrupt/web/vendor/shaka-player.js'),'corrupt provider');
await rm(path.join(work,'missing/web/vendor/shaka-player.js'));
await mkdir(path.join(work,'media/hls'),{recursive:true});await mkdir(path.join(work,'media/dash'));
run('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=160x90:rate=30:duration=6','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=6','-c:v','libx264','-pix_fmt','yuv420p','-g','60','-c:a','aac','-ac','2','-movflags','+faststart',path.join(work,'media/direct.mp4')]);
for(const format of ['hls','dash'])run('ffmpeg',['-nostdin','-v','error','-i',path.join(work,'media/direct.mp4'),'-map','0','-c','copy',...(format==='hls'?['-f','hls','-hls_time','2','-hls_playlist_type','vod',path.join(work,'media/hls/index.m3u8')]:['-f','dash','-seg_duration','2',path.join(work,'media/dash/index.mpd')])]);
await writeFile(path.join(work,'index.html'),'<!doctype html><title>Shaka provider admission smoke</title><pre id="result">Running</pre><script type="module" src="/tests/shaka-provider-smoke.browser.js"></script>');
const sources=['src/internal/shaka-api.ts','src/internal/shaka-backend.ts','src/internal/shaka-network.ts','src/internal/shaka-runtime.ts','src/internal/provider-build.ts','src/internal/provider-runtime.ts','src/internal/machine/provider-runtime.ts','src/internal/execution-recipes.ts','src/unified-player.ts','tests/shaka-provider-smoke.mjs','tests/shaka-provider-smoke.browser.js','third_party/shaka-player.json'];
const inventory={scope:'Test-only candidate admission; reviewed evidence required before registry update',providerIdentity:identity,coreArchiveSHA256:sha(await readFile(coreAssembly.archive)),providerArchiveSHA256:sha(await readFile(providerAssembly.archive)),admission:{mode:maintained?'maintained':'candidate',beforeSHA256:sha(before),afterSHA256:sha(after)},sources:Object.fromEntries(await Promise.all(sources.map(async source=>[source,sha(await readFile(source))])))};
await writeFile(path.join(work,'inventory.json'),JSON.stringify(inventory,null,2)+'\n');
const server=await serve(repo,path.join(repo,'tests/head-to-head'),path.join(work,'requests.jsonl'));
console.log(JSON.stringify({work,url:server.origin+'/'+path.relative(repo,work)+'/index.html',identity}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit();});

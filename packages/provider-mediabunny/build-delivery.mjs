// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const {build,version}=await import(process.env.DEMUXE_ESBUILD_MODULE?pathToFileURL(process.env.DEMUXE_ESBUILD_MODULE).href:'esbuild');
const root=dirname(fileURLToPath(import.meta.url));
if(!process.argv[2])throw Error('Pass an output directory');
const output=resolve(process.argv[2]);await mkdir(output,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const report={status:'format-delivery-build-checked-not-browser-qualification',esbuild:version,entries:[]};
for(const owner of ['inspect','preview'])for(const kind of ['mp4','webm']){
 const name=owner+'-'+kind;
 const compiled=new Map();
 const result=await build({absWorkingDir:root,nodePaths:process.env.DEMUXE_PROVIDER_NODE_MODULES?[process.env.DEMUXE_PROVIDER_NODE_MODULES]:[],entryPoints:[join(root,name+'.js')],bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,legalComments:'inline',metafile:true,write:false,plugins:[{name:'source-facts',setup(api){api.onLoad({filter:/\.js$/},async({path})=>{const bytes=await readFile(path);compiled.set(path,{bytes:bytes.length,sha256:hash(bytes)});return {contents:bytes,loader:'js'};});}}]});
 const inputs=Object.entries(Object.values(result.metafile.outputs)[0].inputs).filter(([,fact])=>fact.bytesInOutput>0).map(([path,fact])=>({path,bytes:fact.bytesInOutput}));
 const parser=kind==='mp4'?'isobmff-demuxer':'matroska-demuxer';
 assert.ok(inputs.some(input=>input.path.includes(parser)));
 assert.ok(inputs.every(input=>!input.path.endsWith('.wasm')&&(!/demuxer\.js$/.test(input.path)||input.path.endsWith('/demuxer.js')||input.path.includes(parser))),'Unselected parser or Wasm in '+name);
 assert.ok(inputs.every(input=>!input.path.endsWith('/conversion.js')),'Conversion is outside adapter delivery');
 assert.deepEqual(Object.values(result.metafile.outputs)[0].imports,[],'Self-contained format bundle');
 const bytes=result.outputFiles[0].contents;
 await writeFile(join(output,name+'.js'),bytes);
 const upstreamInput=[...compiled.keys()].find(path=>path.includes('/mediabunny/dist/modules/'));
 assert.ok(upstreamInput,'Pinned upstream module origin');
 const upstream=upstreamInput.slice(0,upstreamInput.indexOf('/dist/modules/'));
 const metadata=JSON.parse(await readFile(join(upstream,'package.json'),'utf8'));assert.equal(metadata.version,'1.63.0');
 await writeFile(join(output,'Apache-2.0.txt'),await readFile(join(root,'LICENSE')));
 await writeFile(join(output,'MPL-2.0.txt'),await readFile(join(upstream,'LICENSE')));
 const compiledInputs=[...compiled].map(([path,fact])=>{assert.ok(path.startsWith(upstream+'/')||path.startsWith(root+'/'),'Source outside archived roots');return {path:path.startsWith(upstream+'/')?'upstream/mediabunny/'+path.slice(upstream.length+1):'demuxe-adapter/'+path.slice(root.length+1),...fact};});
 report.entries.push({name,bytes:bytes.length,sha256:hash(bytes),inputs,compiledInputs,upstream:'mediabunny@'+metadata.version});
}
report.builderSHA256=hash(await readFile(fileURLToPath(import.meta.url)));
await writeFile(join(output,'NOTICE.txt'),'Demuxe adapter code: Apache-2.0. MediaBunny1.63.0: Copyright(c)2026-present Vanilagy and contributors; MPL-2.0. Original source notices remain in the bundles. Corresponding preferred source is provided separately by build.mjs; verify exact correspondence with test/rebuild-source.mjs and DEMUXE_FORMAT_DELIVERY. These artifacts remain candidates, not release qualification.\n');
await writeFile(join(output,'format-delivery.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.entries.map(({name,bytes,sha256})=>({name,bytes,sha256}))));

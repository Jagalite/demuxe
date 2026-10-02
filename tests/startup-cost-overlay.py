#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build a temporary startup-timing overlay; leaves production files untouched. Run from repo root."""
from pathlib import Path
import tempfile,json
root=Path.cwd(); dest=Path(tempfile.mkdtemp(prefix='demuxe-startup-phases-'))
(dest/'web').mkdir();(dest/'scripts').mkdir();(dest/'scripts/serve.mjs').write_bytes((root/'scripts/serve.mjs').read_bytes());(dest/'fixtures').symlink_to(root/'fixtures')
for p in (root/'web').iterdir():(dest/'web'/p.name).symlink_to(p)
helper="\nconst startupMark=(phase,start)=>postMessage({type:'startup-diagnostic',phase,start:performance.timeOrigin+start,duration:performance.now()-start});\n"
def patch(name,replacements):
 s=(root/'web'/name).read_text()
 for a,b in replacements:
  assert a in s,a
  s=s.replace(a,b,1)
 p=dest/'web'/name;p.unlink();p.write_text(helper+s)
patch('mpv-subtitle-worker.js',[
("engine=await create({print:()=>{},printErr:()=>{}});check();", "let phaseStart=performance.now();engine=await create({print:()=>{},printErr:()=>{}});startupMark('subtitle-engine-factory',phaseStart);check();phaseStart=performance.now();"),
("io=new Worker(new URL('./io-worker.js',import.meta.url),{type:'module'});", "startupMark('subtitle-service-and-fonts',phaseStart);phaseStart=performance.now();io=new Worker(new URL('./io-worker.js',import.meta.url),{type:'module'});"),
("check();engine._web_io_configure(1,BigInt(info.size));", "startupMark('subtitle-io-worker-ready',phaseStart);phaseStart=performance.now();check();engine._web_io_configure(1,BigInt(info.size));"),
("if(!loaded)throw Error('Subtitle metadata deadline exceeded');", "if(!loaded)throw Error('Subtitle metadata deadline exceeded');startupMark('subtitle-open-metadata',phaseStart);")])
patch('native-remux-worker.js',[
("const {default:createRemux}=await import", "let phaseStart=performance.now();const {default:createRemux}=await import"),
("engine=await createRemux", "startupMark('remux-module-import',phaseStart);phaseStart=performance.now();engine=await createRemux"),
("engine.parseVP9=vp9RemuxConfig;", "startupMark('remux-engine-factory',phaseStart);engine.parseVP9=vp9RemuxConfig;"),
("check(engine._rm_open(data.size,data.videoTrack??-1,data.audioTrack??-1));", "phaseStart=performance.now();check(engine._rm_open(data.size,data.videoTrack??-1,data.audioTrack??-1));startupMark('remux-open-including-io',phaseStart);"),
("check(engine._rm_probe(data.size));", "phaseStart=performance.now();check(engine._rm_probe(data.size));startupMark('remux-probe-including-io',phaseStart);")])
Path('/tmp/demuxe-phases-root').write_text(str(dest));print(dest)

from pathlib import Path
root=Path.cwd();dest=Path(Path('/tmp/demuxe-phases-root').read_text())
helper="\nconst startupMark=(phase,start)=>{const data={type:'startup-diagnostic',phase,start:performance.timeOrigin+start,duration:performance.now()-start};if(typeof document==='undefined')postMessage(data);else dispatchEvent(new CustomEvent('startup-diagnostic',{detail:data}));};\n"
s=(root/'web/native-remux-player.js').read_text()
for a,b in [
 ('this.media=new MediaSource();','const sourceOpenStart=performance.now();this.media=new MediaSource();'),
 ('this.mailbox=new SharedArrayBuffer','startupMark("mse-sourceopen",sourceOpenStart);const sourceWorkerStart=performance.now();this.mailbox=new SharedArrayBuffer'),
 ('this.identity??=ready.identity;', 'startupMark("remux-source-worker-ready",sourceWorkerStart);const muxStart=performance.now();let bufferStart;this.identity??=ready.identity;'),
 ("this.headerAccepted=true;}","this.headerAccepted=true;startupMark('remux-init-to-header',muxStart);bufferStart=performance.now();}"),
 ('return session;', "startupMark('remux-header-to-playable-coverage',bufferStart??muxStart);return session;")]:
 assert a in s,a;s=s.replace(a,b,1)
p=dest/'web/native-remux-player.js';p.unlink();p.write_text(helper+s)
s=(root/'web/native-mse-worker.js').read_text();helper="const OriginalWorker=globalThis.Worker;globalThis.Worker=class extends OriginalWorker{constructor(url,opts){super(url,opts);this.addEventListener('message',({data})=>{if(data.type==='startup-diagnostic')postMessage(data);});}};\n"
p=dest/'web/native-mse-worker.js';p.unlink();p.write_text(helper+s)

s=(root/'web/file-reader.js').read_text()+"""
const originalRead=LocalFileReader.prototype.read;
const originalStats=Object.getOwnPropertyDescriptor(LocalFileReader.prototype,'stats').get;
const readTimings=new WeakMap();
Object.defineProperty(LocalFileReader.prototype,'stats',{get(){return {...originalStats.call(this),...readTimings.get(this)};}});
LocalFileReader.prototype.read=async function(...args){const start=performance.now();try{return await originalRead.apply(this,args);}finally{const ms=performance.now()-start,previous=readTimings.get(this);readTimings.set(this,{readElapsedMs:(previous?.readElapsedMs??0)+ms,maxReadMs:Math.max(previous?.maxReadMs??0,ms)});}};
"""
p=dest/'web/file-reader.js';p.unlink();p.write_text(s)

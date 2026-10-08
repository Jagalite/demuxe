// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_GENERATED??'../web/generated/';
const {SessionPreviewProvider}=await import(base+'preview/session-provider.js');
const {PreviewController}=await import(base+'preview/controller.js');
const {previewMayRunDuringPlayback}=await import(base+'internal/machine/preview-session.js');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const picture=time=>({time,width:8,height:8,image:{blob:new Blob(['jpeg'])},path:'independent'});
function fixture({opening,closing}={}){
 let created=0,destroyed=0,frames=0;
 const backend={createPreviewSession(){created++;return {open:async()=>{await opening?.promise;},frame:async r=>{frames++;return picture(r.time);},destroy:async()=>{destroyed++;await closing?.promise;}};}};
 let binding={backend,key:'one',source:{file:new Blob(['movie'])}};
 const provider=new SessionPreviewProvider(()=>binding,{},()=>true);
 const controller=new PreviewController([provider],{debounceMs:0,bucketSeconds:0,timeoutMs:1000});
 return {controller,provider,backend,set binding(value){binding=value;},get created(){return created;},get destroyed(){return destroyed;},get frames(){return frames;}};
}
test('accepted engine reuses one child; cache avoids decode; clear retires it',async()=>{
 const f=fixture();try{for(const time of [1,2,1])assert.ok(await f.controller.getFrame({time}));assert.equal(f.created,1);assert.equal(f.frames,2);f.controller.clear();await f.controller.drain();assert.equal(f.destroyed,1);await f.controller.getFrame({time:3});assert.equal(f.created,2);}finally{await f.controller.destroy();}assert.equal(f.destroyed,2);
});
for(const action of ['clear','disable','suspend','source','providers','destroy'])test(`${action} releases idle child`,async()=>{
 const f=fixture();await f.controller.getFrame({time:1});
 if(action==='clear')f.controller.clear();if(action==='disable')f.controller.enabled=false;if(action==='suspend')f.controller.setSuspended(true);if(action==='source')f.controller.setSourceIdentity('two');if(action==='providers')f.controller.setProviders([]);if(action==='destroy')await f.controller.destroy();
 await f.controller.drain();assert.equal(f.destroyed,1);await f.controller.destroy();assert.equal(f.destroyed,1);
});
test('abort during initialization settles caller and destroys only preview; late initialization cannot cache',async()=>{
 const opening=deferred(),f=fixture({opening}),cancel=new AbortController();const result=f.controller.getFrame({time:2,signal:cancel.signal}).catch(e=>e);
 while(!f.created)await new Promise(r=>setTimeout(r,1));cancel.abort();assert.equal((await result).name,'AbortError');await f.controller.drain();assert.equal(f.destroyed,1);opening.resolve();await new Promise(r=>setTimeout(r,5));assert.equal(f.frames,0);assert.equal(f.controller.diagnostics.cacheEntries,0);await f.controller.destroy();
});
test('new backend waits for predecessor teardown and never seeks the old child',async()=>{
 const closing=deferred(),f=fixture({closing});await f.controller.getFrame({time:1});f.binding={backend:f.backend,key:'two',source:{file:new Blob(['new'])}};
 const result=f.controller.getFrame({time:2});await new Promise(r=>setTimeout(r,10));assert.equal(f.created,1);assert.equal(f.destroyed,1);closing.resolve();await result;assert.equal(f.created,2);await f.controller.destroy();
});
test('playback policy admits small software, defers unknown/large software, honors host override',()=>{
 assert.equal(previewMayRunDuringPlayback('auto',true,1280,720),true);assert.equal(previewMayRunDuringPlayback('auto',true,1920,1080),false);assert.equal(previewMayRunDuringPlayback('auto',true),false);assert.equal(previewMayRunDuringPlayback('allow',true,3840,2160),true);assert.equal(previewMayRunDuringPlayback('defer',false,640,360),false);assert.equal(previewMayRunDuringPlayback('auto',false),true);
});
test('invalid playback policy fails at construction',()=>assert.throws(()=>new PreviewController([],{duringPlayback:'sometimes'}),TypeError));
const {independentPreviewSession}=await import(base+'internal/preview-session.js');
function decoderFixture(){
 const sizes=[],remotes=[],commands=[];let destroys=0;
 const child={ready:Promise.resolve(),properties:new Map([['video-params',{w:640,h:360}]]),command:async(...args)=>commands.push(args),open:async()=>{},openRemote:async source=>remotes.push(source),resize:(w,h)=>sizes.push([w,h]),seek:async()=>child.properties.set('video-params',{w:2,h:2}),previewSnapshot:async()=>({time:10,width:sizes.at(-1)[0],height:sizes.at(-1)[1],blob:new Blob(['jpg'])}),destroy:async()=>{destroys++;}};
 const surface={tagName:'CANVAS',remove(){}};
 return {child,sizes,remotes,commands,get destroys(){return destroys;},session:independentPreviewSession(child,surface,'hybrid-test',{document:{},maxDecodePixels:8294400})};
}
test('retained decoder placeholder metadata after a seek cannot shrink later previews',async()=>{
 const f=decoderFixture(),signal=new AbortController().signal;await f.session.open({remote:{url:'https://example.test/movie'}},signal);
 for(const time of [10,18,12]){const frame=await f.session.frame({time,width:160,height:90,signal});assert.equal(frame.width,160);assert.equal(frame.height,90);}
 assert.deepEqual(f.sizes,[[160,90],[160,90],[160,90]]);await f.session.destroy();
});
test('preview keeps credentials and origin policy, bounds its cache, never renews playback credentials',async()=>{
 const f=decoderFixture(),source={url:'https://example.test/movie',headers:{Authorization:'Bearer original'},credentials:'include',allowedOrigins:['https://cdn.example.test'],streaming:{representation:'v1'},refreshAuthorization:async()=>{throw Error('Must not call playback refresh');}};
 await f.session.open({remote:source},new AbortController().signal);const copy=f.remotes[0];assert.equal(copy.refreshAuthorization,undefined);assert.equal(copy.credentials,'include');assert.equal(copy.priority,'low');assert.equal(copy.cacheBytes,262144);assert.deepEqual(copy.allowedOrigins,source.allowedOrigins);copy.headers.Authorization='changed';copy.allowedOrigins.push('https://evil.test');copy.streaming.representation='v2';assert.equal(source.headers.Authorization,'Bearer original');assert.equal(source.allowedOrigins.length,1);assert.equal(source.streaming.representation,'v1');await Promise.all([f.session.destroy(),f.session.destroy()]);assert.equal(f.destroys,1);
});
test('release callback reentry cannot recurse or release the same owner twice',async()=>{
 let calls=0,c;const provider={id:'reentrant',priority:1,canHandle:()=>true,getFrame:async r=>picture(r.time),release(){calls++;c.clear();}};
 c=new PreviewController([provider],{debounceMs:0});await c.getFrame({time:1});c.clear();assert.equal(calls,1);await c.destroy();assert.equal(calls,2);
});
test('private Hybrid uses inspected video geometry when mpv exposes a 2x2 transport placeholder',async()=>{
 const f=decoderFixture();f.child.properties.set('video-params',{w:2,h:2});
 const session=independentPreviewSession(f.child,{tagName:'CANVAS',remove(){}},'hybrid-jspi',{document:{},maxDecodePixels:8294400,sourceDimensions:{width:640,height:360}}),signal=new AbortController().signal;
 await session.open({remote:{url:'https://example.test/movie'}},signal);const frame=await session.frame({time:10,width:160,height:90,signal});assert.equal(frame.width,160);assert.equal(frame.height,90);await session.destroy();
});
test('authenticated Hybrid without an early probe uses demux track dimensions',async()=>{
 const f=decoderFixture(),signal=new AbortController().signal;
 f.child.properties.set('video-params',{w:2,h:2});f.child.properties.set('track-list',[{type:'video',selected:true,'demux-w':640,'demux-h':360}]);
 await f.session.open({remote:{url:'https://example.test/movie',headers:{Authorization:'Bearer token'}}},signal);const frame=await f.session.frame({time:10,width:160,height:90,signal});assert.equal(frame.width,160);assert.equal(frame.height,90);await f.session.destroy();
});
for(const retained of [false,true])test(`${retained?'retained placeholder':'decoded display metadata'} preserves anamorphic display geometry`,async()=>{
 const f=decoderFixture(),signal=new AbortController().signal;
 f.child.properties.set('video-params',retained?{w:2,h:2}:{w:720,h:576,dw:768,dh:576});
 f.child.properties.set('track-list',[{type:'video',selected:true,'demux-w':720,'demux-h':576,'demux-par':16/15}]);
 const session=independentPreviewSession(f.child,{tagName:'CANVAS',remove(){}},'aspect-test',{document:{},maxDecodePixels:8294400,sourceDimensions:{width:720,height:576}});
 await session.open({remote:{url:'https://example.test/anamorphic'}},signal);const frame=await session.frame({time:10,width:160,height:90,signal});assert.equal(frame.width,120);assert.equal(frame.height,90);await session.destroy();
});

test('canvas preview ignores temporary coded-size metadata and preserves demux pixel aspect',async()=>{
 const f=decoderFixture(),signal=new AbortController().signal;
 f.child.properties.set('video-params',{w:720,h:576,dw:720,dh:576});
 f.child.properties.set('track-list',[{type:'video',selected:true,'demux-w':720,'demux-h':576,'demux-par':16/15}]);
 const session=independentPreviewSession(f.child,{tagName:'CANVAS',remove(){}},'hybrid-pthread',{document:{},maxDecodePixels:8294400,sourceDimensions:{width:720,height:576}});
 await session.open({remote:{url:'https://example.test/anamorphic'}},signal);
 for(const time of [10,18,12]){const frame=await session.frame({time,width:160,height:90,signal});assert.equal(frame.width,120);assert.equal(frame.height,90);}
 await session.destroy();
});

test('retired initialization rejection cannot destroy the next preview owner',async()=>{
 let rejectOpening,created=0,destroyed=0;
 const opening=new Promise((_,reject)=>rejectOpening=reject);
 const backend={createPreviewSession(){const id=++created;return {open:()=>id===1?opening:Promise.resolve(),frame:async r=>picture(r.time),destroy:async()=>{destroyed++;}};}};
 const provider=new SessionPreviewProvider(()=>({backend,key:'one',source:{file:new Blob(['movie'])}}),{},()=>true);
 const cancel=new AbortController(),old=provider.getFrame({time:1,width:160,signal:cancel.signal}).catch(e=>e);
 while(!created)await new Promise(r=>setTimeout(r,1));cancel.abort();await provider.release();
 assert.ok(await provider.getFrame({time:2,width:160,signal:new AbortController().signal}));
 rejectOpening(Error('late retired decoder failure'));await old;assert.equal(destroyed,1);
 assert.ok(await provider.getFrame({time:3,width:160,signal:new AbortController().signal}));assert.equal(created,2);
 await provider.release();assert.equal(destroyed,2);
});

test('demux geometry applies pixel aspect before rotation for canvas previews',async()=>{
 const f=decoderFixture(),signal=new AbortController().signal;
 f.child.properties.set('video-params',{w:720,h:576,dw:720,dh:576});
 f.child.properties.set('track-list',[{type:'video',selected:true,'demux-w':720,'demux-h':576,'demux-par':16/15,'demux-rotation':90}]);
 await f.session.open({remote:{url:'https://example.test/rotated'}},signal);
 const frame=await f.session.frame({time:10,width:160,height:90,signal});assert.equal(frame.width,68);assert.equal(frame.height,90);await f.session.destroy();
});

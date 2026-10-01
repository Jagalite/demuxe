// SPDX-License-Identifier: MIT
// Experimental Backend transport. Qualification and admission are separate.
import {privateMpv, privateMpvSource} from '../private-mpv.js';
import {PrivatePlaybackHost} from './playback-host.js';
import {PrivateRetainedPresentation} from './retained-presentation.js';
let engine, host, source, timer, closing = false, closed = false, initialized = false, userPaused = true, contextRunning = false;
let chain = Promise.resolve(), nextCommand = 1, generation = 0, target, restarted = false, lastDraws = 0, lastDiagnostics = 0;
let replacing = false, loadRequest = 0;
let pumping = false, closePromise;
let targetDrawBaseline = 0, opening = false, subtitleBytes = 0, subtitleCount = 0;
let pictureId=0,pendingPicture=0,sentDraws=0;
let retained;
const loading = new AbortController(), commands = new Map(), refreshes = new Map(), settings = new Map();
const describe = error => String(error) + (error?.stack ? '\n' + error.stack : '');
const post = value => postMessage(value);
function rejectPending(error) {
  for (const pending of commands.values()) {clearTimeout(pending.timer);pending.reject(error);}commands.clear();
  for (const pending of refreshes.values()) {clearTimeout(pending.timer);pending.reject(error);}refreshes.clear();
}
async function submit(args, seek, subtitle) {
  if (closing) throw Error('Playback host closing');
  if (nextCommand >= 0x3fffffff) throw Error('Command identity limit');
  const id = nextCommand++, replyId = seek === undefined ? id : id + 0x40000000;
  const reply = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {commands.delete(replyId);reject(Error('Native command deadline'));}, 15000);
    commands.set(replyId, {resolve, reject, timer});
  });
  void reply.catch(() => {});
  // The pump resolves replies independently of the serialized RPC queue.
  try {if(subtitle)await host.addSubtitle(id,...subtitle);else if (seek === undefined) await host.command(id, ...args);else await host.seek(id, seek);}
  catch (error) {const pending = commands.get(replyId);if (pending) {clearTimeout(pending.timer);commands.delete(replyId);pending.reject(error);}}
  return reply;
}
async function diagnostics(force = false) {
  if (!host || performance.now() - lastDiagnostics < 100 && !force) return;
  lastDiagnostics = performance.now();
  const audio = host.audio?.snapshot();
  post({type: 'diagnostics', generation, data: {path: 'wasm', decoder: retained?'webcodecs':'software', decoderBackend: retained?'webcodecs':'ffmpeg', runtime: engine.runtime,
    plan: retained?'hybrid-private':'software-private',presentation:retained?{position:host.properties['time-pos']}:undefined,retained:retained?.snapshot(),browserDecoder:engine.decoder?.service.snapshot(),decoderMailbox:engine.decoder?.snapshot(),rendered: host.draws, presentedPosition: host.properties['time-pos'], seeking: target !== undefined,
    heapBytes: engine.raw.memory.buffer.byteLength, audio, scheduler: engine.scheduler.snapshot(), io: engine.source.snapshot()}});
}
async function pump() {
  if (closing || replacing || pumping || !host) return;
  pumping = true;
  try {
    const events = await host.pump();
    if (replacing) return;
    for (const event of events) {
      if (event.event === 'command-reply') {
        const pending = commands.get(event.id);
        if (pending) {clearTimeout(pending.timer);commands.delete(event.id);event.error && event.error !== 'success' ? pending.reject(Error('Command rejected: ' + event.error)) : pending.resolve(event.result);}
      }
      if (event.event === 'playback-restart') restarted = true;
      if (event.event === 'property-change' && event.name === 'pause' && !contextRunning) event.data = userPaused;
      if (event.event === 'property-change' && event.name === 'track-list' && Array.isArray(event.data)) event.data = event.data.map(track => ({...track, id: String(track.id)}));
      post({type: 'event', generation, event});
      if (event.event === 'end-file' && event.reason === 'error') throw Error('Private Software decode failed: ' + (event.error ?? 'end-file error'));
    }
    const hasVideo=host.properties['track-list']?.some(track=>track.type==='video'&&track.selected);
    const audioReady=!hasVideo&&host.properties['track-list']?.some(track=>track.type==='audio'&&track.selected)&&host.audio?.header()[0]>0;
    if (target !== undefined && restarted && (opening || Math.abs(Number(host.properties['time-pos']) - target) < 0.15) && (hasVideo?host.draws > targetDrawBaseline:audioReady)) {target = undefined;opening = false;}
    if(host.draws>sentDraws&&!pendingPicture){
      const epoch=generation,rendered=host.draws,bitmap=await host.serial(()=>createImageBitmap(host.canvas));
      if(replacing||closing||epoch!==generation){bitmap.close();return;}
      pendingPicture=++pictureId;sentDraws=rendered;
      postMessage({type:'picture',generation,pictureId:pendingPicture,rendered,bitmap},[bitmap]);
    }
    if (host.draws > lastDraws) {lastDraws = host.draws;post({type: 'output', generation, position: host.properties['time-pos'], rendered: host.draws, seeking: target !== undefined});}
    await diagnostics();
  } catch (error) {if (!replacing && !closing) await fail(error);return;}
  finally {pumping = false;}
  timer = setTimeout(pump, 8);
}
function close() {
  if (closePromise) return closePromise;
  return closePromise = (async () => {
  closing = true;clearTimeout(timer);loading.abort();source?.close();engine?.source.cancelSource();rejectPending(Error('Playback host closed'));
  try {return host ? await host.destroy() : undefined;}
  finally {engine?.dispose();closed = true;}
  })();
}
async function fail(error) {
  let cleanup, cleanupError;
  try {cleanup = await close();} catch (cause) {cleanupError = describe(cause);}
  post({type: 'fatal', error: describe(error), cleanup, cleanupError});
}
function validateCommand(args) {
  if (!Array.isArray(args) || !args.length || args.length > 4 || args.some(arg => typeof arg !== 'string' || arg.includes('\0'))) throw Error('Invalid playback command');
  if (args[0] === 'set') {
    if(retained&&args[1]==='vf'&&args[2])throw Error('Private Hybrid video filters require Software');
    if (!['pause', 'volume', 'speed', 'aid', 'sid', 'sub-visibility', 'audio-delay', 'sub-delay', 'hr-seek-demuxer-offset','vf','af','sub-font-size','sub-color','sub-border-size','sub-font'].includes(args[1])) throw Error('Unsupported private playback property');
  } else if (!['expand-text', 'frame-step', 'frame-back-step', 'stop'].includes(args[0])) throw Error('Unsupported private playback command');
}
onmessage = ({data}) => {
  if(data.op==='picture-presented'){if(data.pictureId===pendingPicture)pendingPicture=0;return;}
  if (data.op === 'refreshed') {
    const pending = refreshes.get(data.refreshId);if (pending) {clearTimeout(pending.timer);refreshes.delete(data.refreshId);data.error ? pending.reject(Error(data.error)) : pending.resolve(data.update);}return;
  }
  const loadToken = data.op === 'load' ? ++loadRequest : loadRequest;
  if (data.op === 'load') {replacing = true;clearTimeout(timer);rejectPending(Object.assign(Error('Source replaced'),{code:'SOURCE_REPLACED'}));}
  if (data.op === 'close' || data.op === 'load') {source?.close();engine?.source.cancelSource();}
  if (data.op === 'close') {closing = true;clearTimeout(timer);loading.abort();rejectPending(Error('Playback host closed'));}
  chain = chain.then(async () => {
    if ((closed || closing) && data.op !== 'close') throw Error('Playback host closed');
    let result;
    if (data.op === 'init') {
      if (initialized) throw Error('Playback host already initialized');initialized = true;
      if(data.mode!==undefined&&!['software','hybrid'].includes(data.mode))throw Error('Invalid private playback mode');
      if(data.mode==='hybrid')retained=new PrivateRetainedPresentation();
      engine = await privateMpv(data.runtime, 'playback', {signal: loading.signal,maxDecodePixels:data.maxDecodePixels,onFrame:(frame,epoch)=>retained?retained.enqueue(frame,epoch):frame.close()});
      if(retained&&(!engine.decoder||!engine.raw.web_selected_snapshot))throw Error('Private Hybrid engine assets required');
      if (data.font) {engine.module.FS.mkdirTree('/fonts');engine.module.FS.writeFile('/fonts/DejaVuSans.ttf', new Uint8Array(data.font));}
      let fontBytes=0;
      if(!Array.isArray(data.fonts??[])||(data.fonts??[]).length>16)throw Error('Invalid font inventory');
      for(const font of data.fonts??[]){
        if(typeof font.name!=='string'||!/^[a-zA-Z0-9_.:-]{1,128}$/.test(font.name)||font.name==='.'||font.name==='..'||!(font.bytes instanceof ArrayBuffer))throw Error('Invalid font asset');
        fontBytes+=font.bytes.byteLength;if(fontBytes>32*1024*1024)throw Error('Font byte budget');
        engine.module.FS.mkdirTree('/fonts');engine.module.FS.writeFile('/fonts/'+font.name,new Uint8Array(font.bytes));
      }
      const configured = await engine.call('web_configure', data.maxDecodePixels ?? 1920 * 1080, data.maxAllocationBytes ?? 128 * 1024 * 1024);
      if (configured < 0) throw Error('Invalid private decode limits');
      host = new PrivatePlaybackHost(engine, data.canvas, data.width, data.height, {fatalCommandErrors: false,retained,channels:data.channels??2});
      await host.create(new Blob([]), data.port, data.latencyUs);
      contextRunning = data.contextRunning;host.audio.header()[6] = +contextRunning;
      void pump();result = engine.facts();
    } else if (data.op === 'load') {
      if (loadToken !== loadRequest) throw Error('Source load superseded');
      generation = data.generation;target = 0;restarted = false;opening = true;targetDrawBaseline = 0;
      if (source) {
        await host.serial(() => engine.call('web_destroy'));host.created = false;
        source.close();source = undefined;
      }
      for(let i=0;i<subtitleCount;i++){try{engine.module.FS.unlink('/subtitles/'+i);}catch{}}subtitleCount=0;subtitleBytes=0;
      host.properties = {};host.events = [];host.draws = 0;lastDraws = 0;sentDraws=0;retained?.clear(0);host.sourceFailure = undefined;
      const sourceGeneration = generation;
      const refresh = data.canRefresh ? resource => new Promise((resolve, reject) => {
        const refreshId = crypto.randomUUID(), timer = setTimeout(() => {refreshes.delete(refreshId);reject(Error('Authorization refresh deadline'));}, 5000);
        refreshes.set(refreshId, {resolve, reject, timer});post({type: 'refresh', generation: sourceGeneration, refreshId, resource});
      }) : undefined;
      source = privateMpvSource(data, refresh);await source.open(engine);
      if (loadToken !== loadRequest) throw Error('Source load superseded');
      if (!host.created) await host.create(engine.source.source.reader);
      else host.sourceFailure = undefined;
      host.audio.header()[6] = +contextRunning;
      engine.source.drainFailures();
      host.seekPreroll = Math.min(60, data.duration ?? 2);
      replacing = false;void pump();
      for (const [name, value] of settings) await submit(['set', name, name === 'pause' && !contextRunning ? 'yes' : value]);
      await submit(['loadfile', 'brange://source']);result = {generation};
    } else if (data.op === 'command') {
      validateCommand(data.args);
      if (data.args[0] === 'set') settings.set(data.args[1], data.args[2]);
      result = await submit(data.args);
    } else if(data.op==='snapshot'){
      result=await host.serial(async()=>({blob:await host.canvas.convertToBlob({type:'image/png'}),time:Number(host.properties['time-pos'])||0,width:host.width,height:host.height}));
    } else if(data.op==='subtitle'){
      const sub=data.subtitle;
      if(!sub||!['ass','ssa','srt','vtt'].includes(sub.format)||!(sub.bytes instanceof ArrayBuffer)||!sub.bytes.byteLength||sub.bytes.byteLength>16*1024*1024||subtitleBytes+sub.bytes.byteLength>16*1024*1024||subtitleCount>=32)throw Error('Invalid subtitle asset or byte budget');
      if(typeof sub.label!=='string'||sub.label.includes('\0')||sub.label.length>4096||sub.language!==undefined&&(typeof sub.language!=='string'||sub.language.includes('\0')||sub.language.length>256))throw Error('Invalid subtitle metadata');
      const path='/subtitles/'+subtitleCount;
      await host.serial(()=>{engine.module.FS.mkdirTree('/subtitles');engine.module.FS.writeFile(path,new Uint8Array(sub.bytes));});
      try{result=await submit([],undefined,[path,sub.label,sub.language??'',!!sub.select]);subtitleCount++;subtitleBytes+=sub.bytes.byteLength;}
      catch(error){engine.module.FS.unlink(path);throw error;}
    } else if (data.op === 'pause') {
      userPaused = !!data.value;settings.set('pause', userPaused ? 'yes' : 'no');
      result = await submit(['set', 'pause', userPaused || !contextRunning ? 'yes' : 'no']);
    } else if (data.op === 'context') {
      contextRunning = !!data.value;
      if(contextRunning)host.audio.header()[6] = 1;
      try {await submit(['set', 'pause', userPaused || !contextRunning ? 'yes' : 'no']);}
      catch(error){
        // Context state belongs to the player. Replacement may revoke this
        // old core's pause command; the load restores it on the new core.
        if(error.code!=='SOURCE_REPLACED')throw error;
      }
      host.audio.header()[6] = +contextRunning;
      host.audio.header()[5] = data.latencyUs ?? 0;host.audio.pump();result = true;
    } else if (data.op === 'seek') {
      retained?.clear(data.seconds);
      target = data.seconds;restarted = false;opening = false;targetDrawBaseline = host.draws;result = await submit([], data.seconds);
    } else if (data.op === 'resize') {
      if (!Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width < 1 || data.height < 1 || data.width > 1920 || data.height > 1080) throw Error('Invalid dimensions');
      await host.serial(() => {host.width = host.canvas.width = data.width;host.height = host.canvas.height = data.height;});result = true;
    } else if (data.op === 'close') result = await close();
    else throw Error('Unknown private playback operation');
    post({id: data.id, result});
  }).catch(error => {post({id: data.id, error: describe(error)});if (data.op === 'init' || data.op === 'load' && loadToken === loadRequest) void fail(error);});
};

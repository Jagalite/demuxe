// SPDX-License-Identifier: Apache-2.0
// Public-API adapters adapted from the retained comparison and qualification harnesses.
const stage = document.querySelector('#stage');
let player, config, overlay, overlayCanvas, overlayTimer, observer;
const contexts = [], analysers = [], failures = [], events = [];
const originalConnect = AudioNode.prototype.connect;
const OriginalContext = window.AudioContext;
const plain = value => JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? String(v) : v));
const surfaces = tag => [...stage.querySelectorAll(tag), ...[...stage.querySelectorAll('*')].flatMap(e => e.shadowRoot ? [...e.shadowRoot.querySelectorAll(tag)] : [])];
const script = url => new Promise((resolve,reject) => {const s=document.createElement('script'); s.src=url; s.onload=resolve; s.onerror=()=>reject(Error('Missing script '+url)); document.head.append(s);});
addEventListener('error', e => failures.length < 50 && failures.push(e.message));
addEventListener('unhandledrejection', e => failures.length < 50 && failures.push(String(e.reason)));

function observeAudio() {
  const tapped = new WeakSet();
  function tap(node) {
    if (tapped.has(node)) return;
    tapped.add(node);
    const split = node.context.createChannelSplitter(2);
    originalConnect.call(node, split);
    for (let channel=0; channel<2; channel++) {
      const analyser = node.context.createAnalyser(); analyser.fftSize=8192;
      split.connect(analyser,channel); analysers.push({analyser,channel});
    }
  }
  window.AudioContext = class extends OriginalContext {constructor(...args) {super(...args);contexts.push(this);}};
  AudioNode.prototype.connect = function(destination,...args) {
    if (destination instanceof AudioDestinationNode) tap(this);
    return originalConnect.call(this,destination,...args);
  };
  const seen = new WeakSet();
  observer = setInterval(() => {
    for (const video of [...surfaces('video'),...surfaces('audio')]) {
      if (seen.has(video)) continue;
      seen.add(video);
      for (const type of ['ended','stalled','waiting']) video.addEventListener(type, () => events.push({type,time:video.currentTime}));
      try {
        const context = new OriginalContext(); contexts.push(context);
        const source = context.createMediaElementSource(video);
        source.connect(context.destination); tap(source); context.resume();
      } catch(error) {failures.push('Audio observer: '+error.message);}
    }
  }, 30);
}

async function hostASS() {
  await script('/libass/dist/js/subtitles-octopus.js');
  const canvas = document.createElement('canvas'); canvas.width=960; canvas.height=540;
  overlayCanvas=canvas;
  canvas.style.cssText='position:absolute;inset:0;pointer-events:none'; stage.append(canvas);
  overlay = new SubtitlesOctopus({canvas,subUrl:'/fixtures/captions.ass',fonts:['/fixtures/DejaVuSans.ttf'],
    fallbackFont:'/fixtures/DejaVuSans.ttf',workerUrl:'/libass/dist/js/subtitles-octopus-worker.js',
    onError:error=>failures.push(String(error))});
  overlayTimer=setInterval(()=>overlay.setCurrentTime(snapshot().position),1000/30);
}

export async function start(c) {
  config=c;
  if (c.correctness) observeAudio();
  const source = new URL('/fixtures/'+c.file,location.href).href;
  const subtitle=c.subtitle?new URL('/fixtures/'+c.subtitle,location.href).href:null;
  if (c.player==='video') {
    player=document.createElement('video'); stage.append(player); player.src=source;
    if(subtitle){const track=document.createElement('track');track.src=subtitle;track.kind='subtitles';track.default=true;player.append(track);}
  } else if (c.player==='demuxe') {
    const {Player}=await import('/demuxe/web/generated/index.js');
    player=new Player(stage,{assetBase:'/demuxe/',width:960,height:540,...(c.lane==='native'?{mode:'native'}:{})});
    await player.ready; await player.open(c.streamFormat?{url:source,format:c.streamFormat,live:!!c.live}:source);
    if(c.embeddedSubtitle&&player.state.subtitleTracks.length)await player.selectSubtitleTrack(player.state.subtitleTracks[0].id);
    if(subtitle&&!c.subtitleIntegration)await player.addSubtitle(new File([await(await fetch(subtitle)).arrayBuffer()],c.subtitle.split('/').at(-1)));
    if (c.subtitleIntegration==='built-in') {
      await player.addFont(new File([await(await fetch('/fixtures/DejaVuSans.ttf')).arrayBuffer()],'DejaVuSans.ttf'));
      await player.addSubtitle(new File([await(await fetch('/fixtures/captions.ass')).arrayBuffer()],'captions.ass'));
    }
  } else if (c.player==='movi') {
    await import(c.lane==='native-first'?'/packages/movi/package/dist/element.slim.js':'/packages/movi/package/dist/element.js');
    player=document.createElement('movi-player'); player.style.cssText='display:block;width:960px;height:540px';
    player.setAttribute('nohotkeys',''); player.setAttribute('volume','1');player.setAttribute('autoplay','');
    if(c.lane==='native-first') player.setAttribute('engine','native wasm');
    stage.append(player);
    if(c.subtitleIntegration==='built-in') {
      const track=document.createElement('track'); track.src='/fixtures/captions.ass';track.kind='subtitles';track.default=true;track.setAttribute('data-format','ass');player.append(track);
    }
    if(subtitle&&!c.subtitleIntegration){const track=document.createElement('track');track.src=subtitle;track.kind='subtitles';track.default=true;player.append(track);}
    player.src=source;
  } else if (c.player==='libmedia') {
    await script('/libmedia/dist/cheap-polyfill.js');
    window.CHEAP_POLYFILL_URL=new URL('/libmedia/dist/cheap-polyfill.js',location.href).href;
    await script('/packages/libmedia/package/dist/umd/avplayer.js');
    AVPlayer.setLogLevel(3);
    player=new AVPlayer({container:stage,wasmBaseUrl:'/libmedia/dist',...(c.lane==='prefer-mse'?{checkUseMSE:()=>true}:{})});
    await player.load(source,subtitle&&!c.subtitleIntegration?{externalSubtitles:[{source:subtitle,title:'Marked subtitle',lang:'en'}]}:c.subtitleIntegration==='built-in'?{externalSubtitles:[{source:new URL('/fixtures/captions.ass',location.href).href,title:'ASS',lang:'en'}]}:{});
    player.setVolume(1);
  } else throw Error('Unknown player');
  if (config.subtitleIntegration==='host-libass') await hostASS();
  await player.play();
  return snapshot();
}

export function snapshot() {
  const video=surfaces('video').find(v=>v.currentSrc && v.videoWidth);
  let state={};
  if (player) {
    if(config.player==='demuxe') state={position:player.state.currentTime,duration:player.state.duration,paused:player.state.paused,
      route:player.diagnostics?.plan?.id ?? player.state.activeMode,diagnostics:player.diagnostics};
    else if(config.player==='libmedia') state={position:Number(player.currentTime)/1000,duration:Number(player.getDuration())/1000,
      route:player.isMSE()?'mse':'custom',stats:player.getStats()};
    else state={position:player.currentTime,duration:player.duration,paused:player.paused,route:(video||(config.audio!==false&&surfaces('video').some(v=>v.currentSrc&&v.readyState>=2))||surfaces('audio').some(v=>v.currentSrc))?'native-direct':'custom'};
  }
  const audio=analysers.map(({analyser,channel})=>{
    const wave=new Float32Array(analyser.fftSize),bins=new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(wave);analyser.getFloatFrequencyData(bins);
    let bin=0;for(let i=1;i<bins.length;i++)if(bins[i]>bins[bin])bin=i;
    return {channel,rms:Math.sqrt(wave.reduce((n,x)=>n+x*x,0)/wave.length),hz:bin*analyser.context.sampleRate/analyser.fftSize};
  });
  return plain({...state,audio,errors:failures,events,visible:document.visibilityState==='visible',focused:document.hasFocus(),
    video:video?{time:video.currentTime,ended:video.ended,paused:video.paused,total:video.getVideoPlaybackQuality().totalVideoFrames,dropped:video.getVideoPlaybackQuality().droppedVideoFrames}:null});
}
export async function seek(target) {
  if(config.player==='demuxe') await player.seek(target);
  else if(config.player==='libmedia') await player.seek(BigInt(Math.round(target*1000)));
  else player.currentTime=target;
}
export async function pause() {await player.pause();}
export async function resume() {await player.play();}
export async function rate(value) {
  if(['demuxe','libmedia'].includes(config.player)) await player.setPlaybackRate(value);
  else player.playbackRate=value;
}
export async function stop() {
  clearInterval(observer); clearInterval(overlayTimer); overlay?.dispose();overlayCanvas?.remove();
  if(player) {
    if(config.player==='video') {player.pause();player.removeAttribute('src');player.load();player.remove();}
    else if(config.player==='movi') {player.pause();player.remove();}
    else await player.destroy();
    if(config.player==='libmedia') await AVPlayer.stopPipelines();
  }
  for(const context of contexts) if(context.state!=='closed') await context.close();
  // Host-owned overlay is removed by its host; player-owned surfaces are measured first.
  const remaining=surfaces('video').length+surfaces('canvas').length+stage.querySelectorAll('movi-player').length;
  return {remainingSurfaces:remaining,contexts:contexts.map(c=>c.state)};
}
window.api={start,snapshot,seek,pause,resume,rate,stop};

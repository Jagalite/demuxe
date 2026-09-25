// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const variant=process.argv[2]??'ac3';
const fixture=variant==='dts'?'results/unsupported-audio-cpu/20260924-codec-variants/fixtures/h264-1080p60-dts.mkv':variant==='hevc'?'results/unsupported-audio-cpu/20260924-hevc-qualified/fixtures/hevc-main10-1080p30-ac3.mkv':'results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-ac3.mkv';
const result={browser:browser.version(),variant,fixture,phases:[],errors:[]};
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  const media=await page.context().newCDPSession(page),mediaEvents=[];
  media.on('Media.playerPropertiesChanged',event=>mediaEvents.push(event));await media.send('Media.enable');
  page.on('pageerror',error=>{result.errors.push(String(error));console.error('PAGE',error);});
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async()=>{
    const {Player}=await import('/web/generated/index.js');
    window.player=new Player(document.querySelector('#surface'),{width:960,height:540});
    window.errors=[];player.addEventListener('error',event=>errors.push(String(event.detail)));
    const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);
  });
  await page.locator('#source').setInputFiles(fixture);
  await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
  async function phase(name,method,arg=[],waitMs=500){
    if(method)await page.evaluate(({method,arg})=>player[method](...arg),{method,arg});
    await page.waitForTimeout(waitMs);
    const state=await page.evaluate(()=>({plan:player.diagnostics?.plan?.id,position:player.state.currentTime,paused:player.state.paused,backend:player.diagnostics?.backend?.mpvAudio,errors}));
    result.phases.push({name,state});console.log(name,JSON.stringify({plan:state.plan,position:state.position,error:state.backend?.errorMs,p95:state.backend?.absErrorP95Ms,underruns:state.backend?.preEofUnderruns,userSeeks:state.backend?.userSeeks,errors:state.errors}));
  }
  await phase('open',null,[],100);
  await phase('steady','play',[],2800);
  await phase('1.5x','setPlaybackRate',[1.5],2200);
  await phase('return 1x','setPlaybackRate',[1],1200);
  await phase('long pause','pause',[],8000);
  await phase('resume','play',[],1200);
  await phase('forward seek','seek',[18],1000);
  await phase('backward seek','seek',[4],1000);
  await phase('pause before seek','pause',[],200);
  await phase('paused seek','seek',[8],200);
  await phase('resume after seek','play',[],800);
  await phase('near EOF','seek',[26],5000);
  await phase('replay seek','seek',[4],200);
  await phase('replay','play',[],1000);
  const mediaProperties=mediaEvents.flatMap(event=>event.properties??[]);
  result.browserVideoDecoder={name:mediaProperties.find(p=>p.name==='kVideoDecoderName')?.value??null,platform:mediaProperties.find(p=>p.name==='kIsPlatformVideoDecoder')?.value??null};
  const destroyAt=performance.now();await page.evaluate(()=>player.destroy());result.destroyMs=performance.now()-destroyAt;
  await page.waitForTimeout(250);result.workersAfterDestroy=page.workers().length;
  result.passed=result.errors.length===0&&result.phases.every(p=>p.state.plan==='native-video-mpv-audio'&&!p.state.errors.length&&p.state.backend?.preEofUnderruns===0)&&result.workersAfterDestroy===0;
}finally{await browser.close();await server.close();}
await mkdir('results/selective-production',{recursive:true});
await writeFile(`results/selective-production/smoke-${variant}.json`,JSON.stringify(result,null,2)+'\n');
if(!result.passed)process.exitCode=1;

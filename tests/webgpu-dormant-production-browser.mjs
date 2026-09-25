// SPDX-License-Identifier: Apache-2.0
// Verify the deferred ProRes proof cannot make normal playback load GPU codec assets.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const server=await serve();
const browser=await chromium.launch({headless:true,channel:'chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
try{
  const page=await browser.newPage();
  const loaded=[];
  page.on('request',request=>loaded.push(new URL(request.url()).pathname));
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async()=>{
    const {Player}=await import('/web/generated/index.js');
    window.player=new Player(document.querySelector('#surface'));
  });
  const bytes=await readFile('experiments/webgpu-compute-decoder/raw/prores-proxy.mov');
  await page.evaluate(async encoded=>{
    const data=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
    await window.player.open(new File([data],'prores-proxy.mov',{type:'video/quicktime'}));
  },bytes.toString('base64'));
  await page.evaluate(()=>window.player.play());
  await page.waitForFunction(()=>Number(window.player.properties.get('time-pos'))>.3);
  const state=await page.evaluate(()=>({mode:window.player.mode,
    decoder:window.player.diagnostics.backend?.decoderBackend??window.player.diagnostics.backend?.decoder,
    webgpu:window.player.diagnostics.backend?.webgpu??null}));
  assert.equal(state.mode,'software');
  assert.equal(state.decoder,'ffmpeg');
  assert.equal(state.webgpu?.selected??false,false);
  const forbidden=loaded.filter(path=>
    /^\/web\/webgpu\/(?:runtime|mailbox-service|presenter|codecs\/)/.test(path)||
    /^\/experiments\/prores-/.test(path));
  assert.deepEqual(forbidden,[]);
  await page.evaluate(()=>window.player.destroy());
  console.log(JSON.stringify({passed:true,mode:state.mode,decoder:state.decoder,
    webgpuSelected:state.webgpu?.selected??false,forbiddenRequests:forbidden.length}));
}finally{await browser.close();await server.close();}

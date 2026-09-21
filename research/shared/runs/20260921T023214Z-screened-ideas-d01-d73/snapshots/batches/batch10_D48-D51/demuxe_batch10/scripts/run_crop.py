# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
from PIL import Image
import numpy as np,base64,io
out={'contract':'CSS display-only crop versus independently cropped uncropped browser screenshot; no export or reduced decode-work claim','cases':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 for dpr in [1,2]:
  ctx=browser.new_context(viewport={'width':720,'height':400},device_scale_factor=dpr);page=ctx.new_page();page.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
  page.set_content('<style>body{margin:0;background:#d5d5d5}video{display:block;width:160px;height:96px;max-width:none;object-fit:fill}#ref{position:absolute;left:0;top:0}#viewport{position:absolute;left:240px;top:0;width:160px;height:96px;overflow:hidden}#v{position:absolute;left:0;top:0}</style><video id="ref" muted></video><div id="viewport"><video id="v" muted></video></div>')
  for s in ['sha256.js','browser_base.js']:page.add_script_tag(content=(R/'scripts'/s).read_text())
  page.evaluate('''async()=>{window.ref=document.getElementById('ref');window.v=document.getElementById('v');window.viewport=document.getElementById('viewport');window.loads=0;v.addEventListener('loadedmetadata',()=>loads++);window.url=URL.createObjectURL(new Blob([await loadFile('clock_base.mp4')],{type:'video/mp4'}));let waits=[event(ref,'loadedmetadata'),event(v,'loadedmetadata')];ref.src=url;v.src=url;await Promise.all(waits);window.crop=(r,wrong=false)=>{if(r.length!==4||r.some(n=>!Number.isInteger(n)))throw Error('integer rectangle required');const [x,y,w,h]=r;if(x<0||y<0||w<=0||h<=0||x+w>v.videoWidth||y+h>v.videoHeight)throw Error('rectangle outside source');window.rect=r;viewport.style.width=w+'px';viewport.style.height=h+'px';v.style.left=(-x-(wrong?1:0))+'px';v.style.top=-y+'px';};window.clicks=[];viewport.addEventListener('click',e=>{const b=viewport.getBoundingClientRect();clicks.push([e.clientX-b.left+rect[0],e.clientY-b.top+rect[1]])});}''')
  for time in [.14,1.02,2.62,.54]:
   frames=page.evaluate('(t)=>Promise.all([seekPicture(ref,t),seekPicture(v,t)])',time)
   raw=page.locator('#ref').screenshot();base=Image.open(io.BytesIO(raw)).convert('RGBA');tag=str(time).replace('.','_');(E/f'crop_ref_{dpr}_{tag}.png').write_bytes(raw)
   for r in [[8,8,144,80],[23,7,115,83],[40,20,64,52]]:
    page.evaluate('(r)=>crop(r)',r);page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    raw=page.locator('#viewport').screenshot();candidate=Image.open(io.BytesIO(raw)).convert('RGBA');x,y,w,h=r;ref=base.crop((x*dpr,y*dpr,(x+w)*dpr,(y+h)*dpr));a=np.asarray(candidate).astype('int16');b=np.asarray(ref).astype('int16');name=f'crop_{dpr}_{tag}_{x}_{y}.png';(E/name).write_bytes(raw)
    page.locator('#viewport').click(position={'x':5,'y':7});click=page.evaluate('clicks[clicks.length-1]')
    out['cases'].append(dict(dpr=dpr,time=time,crop=r,requested_media_time=frames[0]['mediaTime'],candidate_media_time=frames[1]['mediaTime'],shape=list(a.shape),differences=int(np.count_nonzero(a!=b)),max_error=int(np.max(abs(a-b))),source_frame_hash=frames[0]['hash'],candidate_full_frame_hash=frames[1]['hash'],output_png=name,click_source_coordinates=click,expected_click=[x+5,y+7]))
  page.evaluate('()=>crop([8,8,144,80],true)');page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');raw=page.locator('#viewport').screenshot();a=np.asarray(Image.open(io.BytesIO(raw)).convert('RGBA')).astype('int16');b=np.asarray(base.crop((8*dpr,8*dpr,152*dpr,88*dpr))).astype('int16');out.setdefault('negative_wrong_origin',[]).append(dict(dpr=dpr,differences=int(np.count_nonzero(a!=b)),max_error=int(np.max(abs(a-b)))))
  controls=page.evaluate('''()=>[[0,0,161,80],[-1,0,10,10],[.5,1,20,20],[0,0,0,20]].map(r=>{try{crop(r);return {r,rejected:false}}catch(e){return{r,rejected:true,error:String(e)}}})''');out.setdefault('guard_controls',[]).append({'dpr':dpr,'cases':controls})
  life=page.evaluate('''async()=>{crop([8,8,144,80]);const before={src:v.src,loads};await seekPicture(v,2.62);let wait=event(v,'ended');v.playbackRate=4;await Promise.all([v.play(),wait]);const o={before,ended:v.ended,time:v.currentTime,duration:v.duration,loads,sameUrl:v.src===before.src};for(const a of [v,ref]){a.pause();a.removeAttribute('src');a.load();a.remove()}URL.revokeObjectURL(url);o.cleaned=true;return o}''');out.setdefault('lifecycle',[]).append({'dpr':dpr,**life});ctx.close();save('browser_crop.json',out)
 browser.close()
print('CROPS',len(out['cases']),'exact',sum(q['differences']==0 for q in out['cases']),'max',max(q['max_error'] for q in out['cases']));print(out['negative_wrong_origin']);print(out['lifecycle'])

# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
import base64
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for f in ['sha256.js','browser.js','webp_browser.js']:pg.add_script_tag(content=(R/'scripts'/f).read_text())
 pg.evaluate('(m)=>window.webpManifest=m',json.loads((E/'webp_manifest.json').read_text()));o=pg.evaluate('()=>runWebP({profile:"fractional",mode:"correct",framePNG:true})');save('webp_png_composition.json',o)
 per=pg.evaluate('''async()=>{let out=[];for(const profile of ['binary','fractional'])for(const f of webpManifest[profile].frames){let canvases=[];for(const [file,type] of [[f.file,'image/webp'],[f.frame_reference,'image/png']]){let b=await createImageBitmap(new Blob([await load(file)],{type})),c=mkCanvas(f.w,f.h),x=c.getContext('2d');x.drawImage(b,0,0);b.close();canvases.push(x.getImageData(0,0,f.w,f.h).data)}out.push({profile,file:f.file,...cmp(...canvases)})}return out}''');save('webp_frame_decode_comparison.json',per)
 print('Per-frame checks',sum(x['exact'] for x in per),'/',len(per),'PNG composed',sum(c['exact'] for c in o['checks']),flush=True)
 m=json.loads((E/'ogg_manifest.json').read_text());m['page_slices']=[[(p['start'],p['end']) for p in m['pages'] if p['serial']==s['serial']] for s in m['streams']]
 pg.evaluate('(m)=>window.oggManifest=m',m)
 res=pg.evaluate('''async()=>{let o=[],raw=await load('multiplexed.oga');for(let i=0;i<2;i++){let parts=oggManifest.page_slices[i].map(([a,b])=>raw.subarray(a,b)),blob=new Blob(parts,{type:'audio/ogg'}),u=URL.createObjectURL(blob),v=document.createElement('audio');document.body.append(v);let r={stream:i,parts:parts.length,bytes:blob.size,materializedHash:hash(new Uint8Array(await blob.arrayBuffer())),referenceHash:hash(await load(`selected${i}.oga`)),seeks:[]};v.src=u;try{if(v.readyState<1)await ev(v,'loadedmetadata');r.duration=v.duration;for(let t of [.73,.21]){let p=ev(v,'seeked');v.currentTime=t;await p;r.seeks.push(v.currentTime)}let e=ev(v,'ended',4000);await v.play();await e;r.ended=true}catch(e){r.error=String(e)}finally{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u);r.cleaned=true}o.push(r)}return o}''');save('browser_page_views.json',res);print('Pageviews',res,flush=True)
 b.close()

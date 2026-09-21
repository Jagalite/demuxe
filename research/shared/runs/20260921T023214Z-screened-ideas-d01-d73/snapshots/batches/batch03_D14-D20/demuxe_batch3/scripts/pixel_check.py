"""Strict same-file paused direct/MSE frame comparison; diagnostic, not hardware evidence."""
from pathlib import Path
import base64,json,shutil,hashlib
import numpy as np
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence'
js='''async({direct,name})=>{
 const v=document.createElement('video');v.width=160;v.height=96;v.muted=true;document.body.appendChild(v);let ms,url;const results=[];
 try{
  if(direct){url=URL.createObjectURL(new Blob([await loadFile(name)],{type:'video/mp4'}));v.src=url}
  else{ms=new MediaSource();url=URL.createObjectURL(ms);v.src=url;await event(ms,'sourceopen');let sb=ms.addSourceBuffer('video/mp4; codecs="'+manifest.video_codec+'"');await append(sb,await loadFile(name));ms.endOfStream()}
  if(v.readyState<1)await event(v,'loadedmetadata');
  for(let time of [.5,1.5,2.5]){
   const frame=new Promise(resolve=>{v.requestVideoFrameCallback((t,m)=>resolve(m))});
   const s=event(v,'seeked');v.currentTime=time;const [,meta]=await Promise.all([s,frame]);
   const c=document.createElement('canvas');c.width=160;c.height=96;c.getContext('2d').drawImage(v,0,0);const data=c.getContext('2d').getImageData(0,0,160,96).data;
   results.push({time,mediaTime:meta.mediaTime,hash:hash(data),data:Array.from(data)});
  }
 }finally{v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url)}
 return results;
}'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page();page.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode());page.evaluate('()=>window.loadFile=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0))');page.evaluate('(m)=>window.manifest=m',json.loads((E/'manifest.json').read_text()))
 for n in ['sha256.js','browser.js']:page.add_script_tag(content=(R/'scripts'/n).read_text())
 o={'files':{}}
 for name in ['video.mp4','video_601.mp4','video_709.mp4']:
  d=page.evaluate(js,{'direct':True,'name':name});m=page.evaluate(js,{'direct':False,'name':name});row={'sha256':hashlib.sha256((F/name).read_bytes()).hexdigest(),'frames':[]}
  for x,y in zip(d,m):
   a=np.array(x.pop('data'),dtype=np.int16);c=np.array(y.pop('data'),dtype=np.int16);diff=np.abs(a-c)
   row['frames'].append({'direct':x,'mse':y,'changedComponents':int(np.count_nonzero(diff)),'maxAbs':int(diff.max()),'meanAbs':float(diff.mean())})
  o['files'][name]=row
 (E/'pixel_diagnostic.json').write_text(json.dumps(o,indent=2));print(json.dumps(o,indent=2));b.close()

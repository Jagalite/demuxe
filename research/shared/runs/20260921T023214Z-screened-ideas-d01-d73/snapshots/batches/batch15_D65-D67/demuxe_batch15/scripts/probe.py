from common import *
import base64, numpy as np
from playwright.sync_api import sync_playwright
n=60013;t=np.arange(n);a=np.stack((((t*137+t*t*3)%50001)-25000,((t*239+17)%48001)-24000),1).astype('<i2');(F/'probe.s16').write_bytes(a.tobytes())
ff('-f','s16le','-ar','48000','-ac','2','-i',F/'probe.s16','-c:a','flac',F/'probe.flac')
ff('-i',F/'probe.flac','-c:a','copy','-f','ogg',F/'probe.oga')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode());o={}
 for f in ['probe.flac','probe.oga']:
  o[f]=pg.evaluate('''async n=>{const a=new AudioContext({sampleRate:48000});try {const d=Uint8Array.from(atob(await readBytes(n)),x=>x.charCodeAt(0));let out=await a.decodeAudioData(d.buffer);return {frames:out.length,channels:out.numberOfChannels}}catch(e){return {error:String(e)}}finally {await a.close()}}''',f)
 print(o);save('initial_audio_probe.json',o);b.close()

from common import *
from playwright.sync_api import sync_playwright
import base64
# finite destination screen; fixture generation is actual encoding, adapters later must be packet-copy.
names=[]
for codec in ['pcm_mulaw','pcm_alaw','adpcm_ima_wav','adpcm_ms','pcm_s16le']:
 n=codec+'.wav';ff('-f','lavfi','-i','sine=frequency=523:sample_rate=8000:duration=1.337','-c:a',codec,F/n); names.append(n)
 if codec in ['pcm_mulaw','pcm_alaw']:
  a=codec+'.au';ff('-i',F/n,'-c:a','copy',F/a);names.append(a)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page()
 pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 pg.add_script_tag(content=(R/'scripts'/'sha256.js').read_text())
 script='''async ns=>{let o={};for(let n of ns){try{let buf=Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));let c=new OfflineAudioContext(1,1,8000);let x=await c.decodeAudioData(buf.buffer);let a=x.getChannelData(0);o[n]={frames:x.length,channels:x.numberOfChannels,rate:x.sampleRate,hash:sha256Fallback(new Uint8Array(a.buffer)),samples:Array.from(a)}}catch(e){o[n]={error:String(e)}}}return o}'''
 o=pg.evaluate(script,names);save('audio_destination_probe.json',o)
 print(json.dumps({n:{k:v for k,v in d.items() if k!='samples'} for n,d in o.items()},indent=2));b.close()

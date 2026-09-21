from pathlib import Path
import json, subprocess, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(R)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page()
 blank=page.evaluate('({secure:isSecureContext,VideoDecoder:typeof VideoDecoder,ImageDecoder:typeof ImageDecoder,AudioDecoder:typeof AudioDecoder})')
 page.goto(f'http://127.0.0.1:{server.server_port}')
 env=page.evaluate('async()=>{const o={secure:isSecureContext,VideoDecoder:typeof VideoDecoder,AudioDecoder:typeof AudioDecoder,ImageDecoder:typeof ImageDecoder,userAgent:navigator.userAgent,audio:{},video:{},images:{}}; for(const c of ["flac","alac","opus","vorbis","mp4a.40.2","mp3","pcm-s16","pcm-f32"]){try{o.audio[c]=await AudioDecoder.isConfigSupported({codec:c,sampleRate:48000,numberOfChannels:2})}catch(e){o.audio[c]={error:String(e)}}};for(const c of ["avc1.64001f","vp09.00.10.08","vp09.02.10.10","av01.0.01M.08","hvc1.1.6.L93.B0"]){try{o.video[c]=await VideoDecoder.isConfigSupported({codec:c,codedWidth:160,codedHeight:96})}catch(e){o.video[c]={error:String(e)}}};for(const c of ["image/png","image/gif","image/webp","image/jpeg","image/avif"]){try{o.images[c]=await ImageDecoder.isTypeSupported(c)}catch(e){o.images[c]={error:String(e)}}} return o}')
 b.close()
server.shutdown()
out={'blank_page':blank,'loopback':env,'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]}
(R/'evidence/environment.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))

from common import *
from playwright.sync_api import sync_playwright
import base64,sys,platform
stage=sys.argv[1] if len(sys.argv)>1 else 'first'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page();page.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode());page.evaluate('()=>window.loadFile=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0))')
 for n in ['sha256.js','browser.js']:page.add_script_tag(content=(R/'scripts'/n).read_text())
 result={};environment=page.evaluate('({userAgent:navigator.userAgent,secureContext:isSecureContext,VideoDecoder:typeof VideoDecoder,AudioDecoder:typeof AudioDecoder,ImageDecoder:typeof ImageDecoder,MediaSource:typeof MediaSource,createImageBitmap:typeof createImageBitmap})')
 environment.update({'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'python':platform.python_version(),'repository_commit':'01611bdaa2d9a21903bd2f1086fe0d786df6d5d1','application_executed':False,'loopback_probe_error':'net::ERR_BLOCKED_BY_ADMINISTRATOR; not bypassed'})
 save('environment.json',environment)
 def record(key,expression):
  result[key]=page.evaluate(expression);save('browser_'+stage+'.json',result);print(key,'error='+str(result[key].get('error')) if isinstance(result[key],dict) else '',flush=True)
 if stage=='first':
  pmp4=(F/'orientation_base.mp4').read_bytes();i=pmp4.index(b'avcC');page.evaluate('(x)=>window.manifest=x',{'video_codec':'avc1.'+pmp4[i+5:i+8].hex()})
  for f in sorted(F.glob('jpeg_*.jpg')):record(f.name,'bitmap('+json.dumps(f.name)+')')
  record('channel_projection','audioProject()')
  for n in ['orientation_base.mp4','orientation_sei.mp4','orientation_matrix.mp4','orientation_wrong.mp4']:
   for direct in [True,False]:record(n+':'+str(direct),'video('+json.dumps(n)+','+json.dumps(direct)+')')
 elif stage=='images':
  page.add_script_tag(content=(R/'scripts'/'animation_browser.js').read_text())
  for n in sorted(F.glob('rle_*.png')):record(n.name,'bitmap('+json.dumps(n.name)+')')
  record('animation','animationSuite()')
 b.close()

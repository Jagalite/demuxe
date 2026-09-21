from common import *
from playwright.sync_api import sync_playwright
import base64,sys,platform
stage=sys.argv[1] if len(sys.argv)>1 else 'decode'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page()
 pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for n in ['sha256.js','browser.js']:pg.add_script_tag(content=(R/'scripts'/n).read_text())
 env={'browser':b.version,'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'python':platform.python_version(),'features':pg.evaluate(r'({origin:location.origin,secure:isSecureContext,VideoDecoder:typeof VideoDecoder,AudioDecoder:typeof AudioDecoder,MediaSource:typeof MediaSource,pcmMimes:Object.fromEntries(["audio/wav","audio/wav; codecs=\"7\"","audio/wav; codecs=\"6\"","audio/basic"].map(x=>[x,MediaSource.isTypeSupported(x)]))})'),'demuxe_executed':False,'repo':'01611bdaa2d9a21903bd2f1086fe0d786df6d5d1'};save('environment.json',env)
 result={}
 def rec(k,expr):
  result[k]=pg.evaluate(expr);save('browser_'+stage+'.json',result);print(k,json.dumps(result[k])[:1100],flush=True)
 if stage=='decode':
  rec('opus','family(["short_source.opus","unbatched.opus","adaptive.opus","uniform.opus","unbatched.webm","adaptive.webm","uniform.webm","wrong_tail.opus"],48000)')
  for n in ['pcm_mulaw','pcm_alaw']:
   rec(n,'wavePair('+json.dumps(n)+',false)');rec(n+'_allcodes','wavePair('+json.dumps(n)+',true)')
  for codec in ['aac','flac']:rec(codec+'_edits','edits('+json.dumps(codec)+')')
 elif stage=='schedule':
  for codec in ['aac','flac']:
   for variant in ['single','double']:
    for negative in [False,True]:rec(codec+'_'+variant+'_'+str(negative),'scheduled('+json.dumps(codec)+','+json.dumps(variant)+','+json.dumps(negative)+')')
  rec('guards','scheduleGuards()')
 elif stage=='images':
  for name in ['baseline','progressive','gray','oriented_icc']:
   for ext in ['.jpg','.jxl','_recovered.jpg','_no_recon.jxl']:rec(name+ext,'image('+json.dumps(name+ext)+')')
 elif stage=='opuslife':
  for n in ['unbatched','adaptive','uniform']:rec(n,'audioLife('+json.dumps(n+'.webm')+',\'audio/webm; codecs="opus"\',true)')
 elif stage=='aulife':
  for n in ['pcm_mulaw','pcm_alaw']:
   rec(n+'_source','audioLife('+json.dumps(n+'.au')+',"audio/basic",false,8000)')
   rec(n+'_wrapped','audioLife('+json.dumps(n+'_wrapped.wav')+',"audio/wav",false,8000)')
 elif stage=='editlife':
  for n in ['aac_edit_source','aac_single','aac_double','flac_edit_source','flac_single','flac_double']:rec(n,'audioLife('+json.dumps(n+'.mp4')+',"audio/mp4",false)')
 b.close()

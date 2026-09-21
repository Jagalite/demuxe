from common import *
from playwright.sync_api import sync_playwright
import base64,os
stage=sys.argv[1] if len(sys.argv)>1 else 'multi'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page()
 pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for n in ['sha256.js','browser.js']:pg.add_script_tag(content=(R/'scripts'/n).read_text())
 for n in ['lacing.js','chain.js','resample.js']:
  if (R/'scripts'/n).exists():pg.add_script_tag(content=(R/'scripts'/n).read_text())
 env={'browser':b.version,'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'python':platform.python_version(),'features':pg.evaluate('({origin:location.origin,secure:isSecureContext,VideoDecoder:typeof VideoDecoder,AudioDecoder:typeof AudioDecoder,MediaSource:typeof MediaSource})'),'demuxe_executed':False,'repo':'01611bdaa2d9a21903bd2f1086fe0d786df6d5d1'};save('environment.json',env)
 result={}
 def rec(k,expr):
  try:result[k]=pg.evaluate(expr)
  except Exception as e:result[k]={'harnessError':str(e)}
  save('browser_'+stage+'.json',result);print(k,json.dumps(result[k])[:2500],flush=True)
 if stage=='multi':rec('decoding','multi()')
 elif stage=='multilife':
  for n,ch in [('front_pair',2),('center',1),('rear_pair',2)]:rec(n,'audioLife('+json.dumps(n+'.webm')+',\'audio/webm; codecs="opus"\',true,'+str(ch)+')')
 elif stage=='lacing':rec('decoding','lacingDecode()')
 elif stage=='lacinglife':
  for n in ['plain_xiph.webm','stripped_xiph.mka','stripped_ebml.mka','recovered_xiph.webm','recovered_ebml.webm','wrong_restore.webm']:
   rec(n,'audioLife('+json.dumps(n)+',\'audio/webm; codecs="opus"\',true,2)')
 elif stage=='lacingdirect':
  for n in ['stripped_xiph.mka','recovered_xiph.webm']:
   rec(n,'audioLife('+json.dumps(n)+',"audio/webm",false,2)')
 elif stage=='chain':rec('decoding','chainDecode()');rec('schedule','chainSchedule(false)');rec('wrong_schedule','chainSchedule(true)')
 elif stage=='chainlife':rec('original','audioLife("chained.opus","audio/ogg",false,2,[.25,1.7,2.5])')
 elif stage=='resample':rec('results','resampleTest()')
 elif stage=='resample_followup':rec('results','resampleFollowup()')
 b.close()

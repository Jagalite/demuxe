# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
import base64,sys
stage=sys.argv[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':500,'height':360})
 def read(n):
  path=(F/n).resolve()
  if path.parent!=F.resolve():raise ValueError('fixture path')
  return base64.b64encode(path.read_bytes()).decode()
 page.expose_function('readBytes',read)
 for n in ['sha256.js','browser.js']:page.add_script_tag(content=(R/'scripts'/n).read_text())
 for n in ['video','tiff']:page.evaluate('(x)=>window[x.n]=x.data',{'n':n,'data':json.loads((E/(n+'_manifest.json')).read_text())})
 o={'environment':page.evaluate('({userAgent:navigator.userAgent,secureContext:isSecureContext,VideoDecoder:typeof VideoDecoder,MediaSource:typeof MediaSource,AudioContext:typeof AudioContext})')}
 def rec(k,expr):
  o[k]=page.evaluate(expr);save('browser_'+stage+'.json',o);print(k,json.dumps(o[k])[:750],flush=True)
 if stage=='video':
  for mode in ['mse','direct']:
   for name in ['original','damaged','repaired']:rec(name+'_'+mode,'videoTest('+json.dumps(name)+','+json.dumps(mode)+')')
  for name in ['original','damaged','repaired']:rec(name+'_cold','videoTest('+json.dumps(name)+',"mse",true)')
 elif stage=='tiff':rec('result','tiffTest()')
 elif stage=='tiff_region':rec('result','tiffRegionTest()')
 elif stage=='loop':rec('result','loopTest()')
 elif stage=='loop_followup':rec('result','loopFollowup()')
 else:raise ValueError(stage)
 b.close()

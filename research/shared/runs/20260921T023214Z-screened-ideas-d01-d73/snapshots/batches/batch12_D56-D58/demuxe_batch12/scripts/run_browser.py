# SPDX-License-Identifier: MIT
from pathlib import Path
import json,sys,base64
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];E=R/'evidence';F=R/'fixtures'
stage=sys.argv[1] if len(sys.argv)>1 else 'video'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':500,'height':320})
 def read(n):
  path=(F/n).resolve()
  if path.parent!=F.resolve():raise ValueError('fixture path')
  return base64.b64encode(path.read_bytes()).decode()
 page.expose_function('readBytes',read)
 for n in ['sha256.js','browser.js']:page.add_script_tag(content=(R/'scripts'/n).read_text())
 for name in ['video','sparse','iir']:page.evaluate('(x)=>window[x.name]=x.manifest',{'name':name,'manifest':json.loads((E/(name+'_manifest.json')).read_text())})
 o={'environment':page.evaluate('({userAgent:navigator.userAgent,secureContext:isSecureContext,VideoDecoder:typeof VideoDecoder,MediaSource:typeof MediaSource,IIRFilterNode:typeof IIRFilterNode,ConstantSourceNode:typeof ConstantSourceNode})')}
 def rec(k,expr):
  o[k]=page.evaluate(expr);(E/('browser_'+stage+'.json')).write_text(json.dumps(o,indent=2));print(k,json.dumps(o[k])[:450],flush=True)
 if stage=='video':
  for mode in ['direct','mse']:
   for name in ['repeat','recall','hold','stale','cold']:rec(name+'_'+mode,'videoTest('+json.dumps(name)+','+json.dumps(mode)+')')
 elif stage=='continuous':
  for name in ['repeat','recall','hold','stale']:rec(name,'videoContinuous('+json.dumps(name)+')')
 elif stage=='sparse':
  rec('result','sparseTest()')
  for fn in ['sparse.wav','dense.wav']:rec(fn,'sparseLife('+json.dumps(fn)+')')
 elif stage=='iir':rec('result','iirTest()')
 else:raise ValueError(stage)
 b.close()

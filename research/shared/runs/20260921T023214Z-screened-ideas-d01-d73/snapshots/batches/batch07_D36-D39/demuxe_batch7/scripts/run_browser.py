from common import *
from playwright.sync_api import sync_playwright
import base64
stage=sys.argv[1] if len(sys.argv)>1 else 'views'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page()
 pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for n in ['sha256.js','browser.js']:pg.add_script_tag(content=(R/'scripts'/n).read_text())
 pg.evaluate('(m)=>window.manifest=m',json.loads((E/'manifest.json').read_text()));out={}
 def rec(k,expr):
  out[k]=pg.evaluate(expr);save('browser_'+stage+'.json',out);x=out[k];print(k, str({z:v for z,v in x.items() if z not in ['pictures','observed']})[:1000],'pictures',len(x.get('pictures',[])),flush=True)
 if stage=='views':
  for n in ['a.mp4','b.mp4']:rec(n,'playBlob('+json.dumps(n)+')')
  for n in ['edited','aliased']:rec(n,'playBlob('+json.dumps(n)+',true)')
  rec('stale_source','playBlob("edited",true,true)')
  rec('wrong_offset','playBlob("edited_wrong_offset.mp4")')
 elif stage=='ordered':
  pg.add_script_tag(content=(R/'scripts'/'ordered.js').read_text());pg.evaluate('(m)=>window.orderManifest=m',json.loads((E/'order_manifest.json').read_text()))
  for variant in ['baseline','permuted','tail_first','sparse_seek','wrong_sequence','duplicate','wrong_time']:
   rec(variant,'ordered('+json.dumps(variant)+')')
 elif stage in ['avif','avif_rgb']:
  pg.add_script_tag(content=(R/'scripts'/'avif_browser.js').read_text());pg.evaluate('(m)=>window.avifManifest=m',json.loads((E/(stage+'_manifest.json')).read_text()))
  rec('images','avifImages()')
  for mode in ['direct','mse']:rec(mode,'avifVideo('+json.dumps(mode)+')')
 b.close()

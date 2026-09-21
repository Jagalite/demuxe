# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
import base64,sys
mode=sys.argv[1] if len(sys.argv)>1 else 'ogg'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for n in ['sha256.js','browser.js']:pg.add_script_tag(content=(R/'scripts'/n).read_text())
 if mode=='ogg':
  o=pg.evaluate('()=>runOgg()');save('browser_ogg.json',o);print(json.dumps(o,indent=2))
 else:
  pg.evaluate('(m)=>window.videoManifest=m',json.loads((E/'video_manifest.json').read_text()));o={}
  for m in (['ref-a','ref-b','fresh_init'] if mode=='video1' else ['unchanged','mapped','wrong_picture']):
   o[m]=pg.evaluate('(m)=>runVideo(m)',m);save('browser_'+mode+'.json',o);print(m,'checks',len(o[m]['checks']),'error',o[m].get('error'), 'EOF',o[m].get('ended'),flush=True)
 b.close()

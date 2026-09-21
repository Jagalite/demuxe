# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
import base64
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for f in ['sha256.js','browser.js','webp_browser.js']:pg.add_script_tag(content=(R/'scripts'/f).read_text())
 pg.evaluate('(m)=>window.webpManifest=m',json.loads((E/'webp_manifest.json').read_text()));o={}
 for profile,mode in [('binary','correct'),('fractional','correct'),('binary','ignore-dispose'),('binary','ignore-blend')]:
  arg={'profile':profile,'mode':mode};v=pg.evaluate('(a)=>runWebP(a)',arg);key=profile+'_'+mode;o[key]=v;save('browser_webp.json',o);print(key,sum(q['exact'] for q in v['checks']),len(v['checks']),'max',max(q['maxAbs'] for q in v['checks']),flush=True)
 b.close()

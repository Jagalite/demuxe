# SPDX-License-Identifier: MIT
from common import *
import base64
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for n in ['sha256.js','pgs_browser.js']:pg.add_script_tag(content=(R/'scripts'/n).read_text())
 pg.evaluate('(x)=>window.pgsManifest=x',json.loads((E/'pgs_manifest.json').read_text()));out={}
 for mode in ['correct','wrong-palette','wrong-epoch','wrong-clear']:
  out[mode]=pg.evaluate('(m)=>runPGS(m)',mode);save('browser_pgs.json',out);print(mode,'exact',sum(q['exact'] for q in out[mode]['checks']),'/',len(out[mode]['checks']),'error',out[mode].get('error'),flush=True)
 b.close()

from common import *
from playwright.sync_api import sync_playwright
import base64
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for name in ['sha256.js','browser_base.js','rebase.js']:pg.add_script_tag(content=(R/'scripts'/name).read_text())
 o=pg.evaluate('(m)=>rebaseScreen(m)',json.loads((E/'clock_manifest.json').read_text()));save('browser_rebase.json',o);print(json.dumps(o,indent=2));b.close()

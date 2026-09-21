# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for n in ['sha256.js','browser_caf.js']:pg.add_script_tag(content=(Path(__file__).parent/n).read_text())
 o=pg.evaluate('()=>runCAF()');save('browser_caf.json',o);b.close();print(json.dumps(o,indent=2))

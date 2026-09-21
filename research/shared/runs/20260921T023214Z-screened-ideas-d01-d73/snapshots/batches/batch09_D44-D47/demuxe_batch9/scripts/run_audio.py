from common import *
from playwright.sync_api import sync_playwright
import base64
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page()
 pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for script in ['sha256.js','browser_base.js','audio_browser.js']:pg.add_script_tag(content=(R/'scripts'/script).read_text())
 m=json.loads((E/'vorbis_manifest.json').read_text());out=pg.evaluate('(m)=>vorbisWindows(m)',m);save('browser_vorbis.json',out);print(json.dumps(out,indent=2));b.close()

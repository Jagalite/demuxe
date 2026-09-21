from common import *
from playwright.sync_api import sync_playwright
import base64
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for s in ['sha256.js','browser_base.js','video_browser.js']:pg.add_script_tag(content=(R/'scripts'/s).read_text())
 m=json.loads((E/'clock_manifest.json').read_text());o={}
 def rec(n,files,offset=None):
  sp=dict(name=n,mode='mse',codec=m['codec'],files=[m['init']]+files,times=m['times'])
  if offset is not None:sp['offset']=offset
  o[n]=pg.evaluate('(s)=>videoCase(s)',sp);save('browser_clock.json',o);print(n,{k:v for k,v in o[n].items()if k not in ['pictures','appends']},o[n].get('pictures'),flush=True)
 rec('base',m['base_fragments'])
 for j in m['origins']:
  rec('offset_'+j['origin'],j['shifted'],j['offset']);rec('integer_'+j['origin'],j['rebased']);rec('rounded_'+j['origin'],j['rounded'])
 b.close()

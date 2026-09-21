from common import *
from playwright.sync_api import sync_playwright
import base64,platform
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=b.new_page()
 page.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for name in ['sha256.js','browser_base.js','audio.js']:page.add_script_tag(content=(R/'scripts'/name).read_text())
 save('environment.json',{'browser':b.version,'platform':platform.platform(),'python':sys.version,'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'page':page.evaluate('({origin:location.origin,secure:isSecureContext,VideoDecoder:typeof VideoDecoder,AudioDecoder:typeof AudioDecoder})'),'repo_commit':'efd9e1537666b3120936ed24a34431645506e953','launch_args':['--no-sandbox','--autoplay-policy=no-user-gesture-required']})
 m=json.loads((E/'mp3_manifest.json').read_text());o=page.evaluate('(m)=>mp3Screen(m)',m);save('browser_mp3.json',o)
 print('MP3 fullframes',o['full_frames']);print([(j['target_frame'],j['tag'],[x['differences']for x in j.get('comparisons',[])],j.get('error'))for j in o['jobs']],flush=True)
 o=page.evaluate('()=>crossfadeScreen()');save('browser_crossfade.json',o);print('CROSSFADE',[(r['fade'],r['variant'],[q['all']['max_error']for q in r['comparisons']])for r in o['results']],flush=True)
 b.close()

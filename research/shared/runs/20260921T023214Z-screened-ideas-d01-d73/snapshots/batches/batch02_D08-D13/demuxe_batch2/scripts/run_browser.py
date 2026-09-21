"""In-memory browser screens; no loopback navigation, GPU or performance claims."""
import json,base64,hashlib,os,shutil,argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence'
parser=argparse.ArgumentParser();parser.add_argument('stage',choices=['routes','direct','combinations','audio','cancellation','audible']);args=parser.parse_args()
manifest=json.loads((E/'manifest.json').read_text());out={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page();page.expose_function('readBytes',lambda name:base64.b64encode((F/name).read_bytes()).decode())
 page.evaluate("""()=>window.loadFile=async name=>{const s=atob(await readBytes(name));return Uint8Array.from(s,c=>c.charCodeAt(0))}""")
 page.evaluate('(m)=>window.manifest=m',manifest);page.add_script_tag(content=(R/'scripts/sha256.js').read_text());page.add_script_tag(content=(R/'scripts/browser.js').read_text())
 out['environment']=page.evaluate('({ua:navigator.userAgent,secure:isSecureContext,VideoDecoder:typeof VideoDecoder,DecompressionStream:typeof DecompressionStream,MediaSource:typeof MediaSource})')
 out['environment']['transport']='in-memory binding, browser navigation to loopback prohibited; no streaming network claim'
 def save(k,js):
  out[k]=page.evaluate(js);(E/f'browser_{args.stage}.json').write_text(json.dumps(out,indent=2));print(k,json.dumps(out[k]),flush=True)
 if args.stage=='routes':
  for name in ['control.mp4','explicit_rate.mp4','canonical_rate.mp4','absolute.mp4','relative.mp4','bad_offset.mp4','missing_tfdt.mp4','inferred_tfdt.mp4']:
   save(name,'trial('+json.dumps(name)+')')
 elif args.stage=='direct':
  for name in ['control.mp4','explicit_rate.mp4','absolute.mp4','missing_tfdt.mp4']:
   save(name,'trial('+json.dumps(name)+',true)')
 elif args.stage=='combinations':
  for i in range(8):save(str(i),'trial('+json.dumps('compound_'+str(i)+'.mp4')+')')
 elif args.stage=='audio':
  for name in ['control.mp4','explicit_rate.mp4','canonical_rate.mp4','absolute.mp4','relative.mp4','inferred_tfdt.mp4','compound_7.mp4']:save(name,'audio('+json.dumps(name)+')')
 elif args.stage=='cancellation':save('cases','cancellationScreen()')
 elif args.stage=='audible':
  for name in ['control.mp4','explicit_rate.mp4','absolute.mp4','missing_tfdt.mp4']:
   save(name+':direct','audibleTrial('+json.dumps(name)+',true)')
  for name in ['control.mp4','canonical_rate.mp4','relative.mp4','inferred_tfdt.mp4','compound_7.mp4']:
   save(name+':mse','audibleTrial('+json.dumps(name)+',false)')
 b.close()

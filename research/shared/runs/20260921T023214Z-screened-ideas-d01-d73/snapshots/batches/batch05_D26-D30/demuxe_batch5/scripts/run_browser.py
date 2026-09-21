from common import *
from playwright.sync_api import sync_playwright
import base64,sys,platform
stage=sys.argv[1] if len(sys.argv)>1 else 'first'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=b.new_page()
 page.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode());page.evaluate('()=>window.loadFile=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0))')
 for n in ['sha256.js','browser.js']:page.add_script_tag(content=(R/'scripts'/n).read_text())
 manifest=json.loads((E/'manifest.json').read_text());x=(F/'bframes.mp4').read_bytes();k=x.index(b'avcC');manifest['bcodec']='avc1.'+x[k+5:k+8].hex();page.evaluate('(m)=>window.manifest=m',manifest)
 save('environment.json',{'browser':b.version,'python':platform.python_version(),'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'features':page.evaluate('({origin:location.origin,secure:isSecureContext,VideoDecoder:typeof VideoDecoder,AudioDecoder:typeof AudioDecoder,MediaSource:typeof MediaSource})'),'repo':'01611bdaa2d9a21903bd2f1086fe0d786df6d5d1','demuxe_executed':False})
 result={}
 def record(k,expr):
  result[k]=page.evaluate(expr);save('browser_'+stage+'.json',result);print(k, 'error='+str(result[k].get('error')) if isinstance(result[k],dict) else '',flush=True)
 if stage=='first':
  record('opus','audioMap()')
  for name in ['epoch0.mp4','epoch1.mp4','epoch2.mp4','clean_aperture.mp4','sps_crop.mp4']:
   for direct in [False,True]:record(name+':'+str(direct),'single('+json.dumps(name)+','+json.dumps(direct)+',[.225,.725,1.225],true)')
 elif stage=='cropfollow':
  for name in ['color_reference.mp4','coherent8.mp4','coherent32.mp4']:
   for direct in [False,True]:record(name+':'+str(direct),'single('+json.dumps(name)+','+json.dumps(direct)+',[.225,.725,1.225],true)')
 elif stage=='opusstream':
  page.add_script_tag(content=(R/'scripts'/'opus_stream.js').read_text())
  record('whole_webm','opusWebmDecode()')
  for name in ['dual','left','right']:record(name,'opusStream('+json.dumps(name)+')')
 elif stage=='sameaspect':
  same=json.loads((E/'same_manifest.json').read_text());page.evaluate('(e)=>manifest.intervals[1]=e',same)
  record('reference','single("same_epoch.mp4",false,[.225,.725,1.225],false)')
  record('one_init','epochs(false,false)');record('fresh_inits','epochs(true,false)')
 elif stage=='boundary':
  same=json.loads((E/'same_manifest.json').read_text());page.evaluate('(e)=>manifest.intervals[1]=e',same)
  record('one_init','epochs(false,false)');record('fresh_inits','epochs(true,false)')
 elif stage=='monostream':
  page.add_script_tag(content=(R/'scripts'/'opus_stream.js').read_text());record('mono','opusStream("mono")')
 elif stage=='epochs':
  record('one_init','epochs(false,false)');record('fresh_inits','epochs(true,false)');record('missing_headers','epochs(false,true)')
 elif stage=='recovery':
  page.add_script_tag(content=(R/'scripts'/'recovery.js').read_text())
  for variant in ['baseline','no_abort','abort_retry','abort_stale','abort_guarded']:
   for fraction in ['header','payload']:record(variant+':'+fraction,'recover('+json.dumps(variant)+','+json.dumps(fraction)+')')
 elif stage=='clip':
  page.add_script_tag(content=(R/'scripts'/'clip.js').read_text())
  for variant in ['reference','window','preroll','zero_retime']:record(variant,'clip('+json.dumps(variant)+')')
 b.close()

from common import *
import base64,platform
from playwright.sync_api import sync_playwright
stage=sys.argv[1] if len(sys.argv)>1 else 'descriptions'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for script in ['sha256.js','browser_base.js','video_browser.js']:pg.add_script_tag(content=(R/'scripts'/script).read_text())
 save('environment.json',{'platform':platform.platform(),'python':sys.version,'browser':b.version,'launch_args':['--no-sandbox','--autoplay-policy=no-user-gesture-required'],'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'navigator':pg.evaluate('({userAgent:navigator.userAgent,secure:isSecureContext,VideoDecoder:typeof VideoDecoder})'),'repo_commit':'015004be024fc04cb0234f523290b4c377870257'})
 results={}
 def rec(name,spec):
  spec['name']=name;results[name]=pg.evaluate('(s)=>Promise.race([videoCase(s),new Promise(r=>setTimeout(()=>r({error:"external case deadline",cleaned:false}),30000))])',spec);save('browser_'+stage+'.json',results)
  q=results[name];print(name,{k:v for k,v in q.items()if k not in ['pictures','appends','mediaErrors']},'pictures',len(q.get('pictures',[])),flush=True)
 if stage=='descriptions':
  m=json.loads((E/'description_manifest.json').read_text());codec=m['codec'];times=m['times']
  for name in ['a','b']:
   rec('ref_'+name,{'mode':'direct','file':f'desc_{name}.mp4','times':[.125,.525,.925,.225]})
   # Reuse the original reference's single fragment, independently from mixed stream.
   from video_build import split
   ii,ff=split((F/f'desc_{name}.mp4').read_bytes());(F/f'desc_{name}_reference.m4s').write_bytes(ff[0])
   rec('ref_'+name+'_mse',{'mode':'mse','codec':codec,'files':[f'desc_{name}.init',f'desc_{name}_reference.m4s'],'times':[.125,.525,.925,.225]})
  rec('original_direct',{'mode':'direct','file':'desc_multi.mp4','times':times})
  rec('original_mse',{'mode':'mse','codec':codec,'files':['desc_multi.init']+[j['source']for j in m['jobs']],'times':times})
  rec('projected',{'mode':'mse','codec':codec,'files':[n for j in m['jobs']for n in [j['init'],j['projected']]],'times':times})
  rec('wrong_first_entry',{'mode':'mse','codec':codec,'files':['desc_a.init']+[j['projected']for j in m['jobs']],'times':times})
 elif stage.startswith('refresh'):
  m=json.loads((E/'refresh_manifest.json').read_text());codec=m['codec'];fs=[j['file']for j in m['fragments']]
  times=[j+i*.05+.025 for j in [1,3] for i in range(20)]
  rec('full',{'mode':'mse','codec':codec,'files':['refresh.init']+fs,'times':times})
  for j in [1,3]:
   t=[j+i*.05+.025 for i in [0,7,8,9,13,19]]
   rec(f'cold_{j}',{'mode':'mse','codec':codec,'files':['refresh.init']+fs[j:],'times':t})
   rec(f'cold_safe_{j}',{'mode':'mse','codec':codec,'files':['refresh.init']+fs[j:],'times':[j+.475,j+.675,j+.975]})
 elif stage in ['colors','color_resolved']:
  m=json.loads((E/'color_manifest.json').read_text())
  for name,s in m.items():
   if stage=='color_resolved' and not name.startswith('resolved_'):continue
   if stage=='colors' and name.startswith('resolved_'):continue
   for mode in ['direct','mse']:
    rec(name+'_'+mode,{'mode':mode,'codec':s['codec'],'files':[s['init']]+s['fragments'],'file':name+'.mp4','times':[.125,.575,1.125,1.825]})
 b.close()

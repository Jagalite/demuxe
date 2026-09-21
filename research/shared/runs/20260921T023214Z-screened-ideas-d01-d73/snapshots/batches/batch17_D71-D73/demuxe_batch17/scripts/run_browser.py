# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
import base64,sys
mode=sys.argv[1];route=sys.argv[2] if len(sys.argv)>2 else 'mse'
manifest=json.loads((E/(mode+'_manifest.json')).read_text())
cases=[]
if mode=='reverse':
 for name in ['forward','reverse','wrong_forward','wrong_duration']:
  a=manifest['assets'][name];times=manifest['times']['forward' if name=='forward' else 'reverse'];case={'name':name,'route':route,'file':name+'.mp4','init':a['init'],'fragments':[v['file'] for v in a['fragments']],'mime':'video/mp4; codecs="'+manifest['codec']+'"','times':[x['query'] for x in times]+[2.125,.175,1.875],'natural':name in ['forward','reverse']};cases.append(case)
elif mode=='duration':
 for name,a in manifest['assets'].items():cases.append({'name':name,'route':route,'file':a['file'],'init':a['init'],'fragments':a['fragments'],'mime':'video/webm; codecs="vp9"','times':[x['query'] for x in manifest['times']]+[.2,2.7,.6],'natural':True})
 if route=='mse':
  a=manifest['assets']['no_durations'];cases.append({'name':'no_durations_forced_end','route':route,'file':a['file'],'init':a['init'],'fragments':a['fragments'],'mime':'video/webm; codecs="vp9"','times':[.0625,.3125,.625,1.125,1.5625,2.1,2.7],'forceDuration':2.75,'natural':True})
  a=manifest['assets']['no_durations'];cases.append({'name':'no_durations_forced_after_end','route':route,'file':a['file'],'init':a['init'],'fragments':a['fragments'],'mime':'video/webm; codecs=\"vp9\"','times':[.0625,.3125,.625,1.125,1.5625,2.1,2.7],'forceAfterEOS':2.75,'natural':True})
elif mode=='geometry':
 for name,a in manifest['assets'].items():cases.append({'name':name,'route':route,'file':a['file'],'init':a['init'],'fragments':[x['file'] for x in a['fragments']],'mime':'video/mp4; codecs=\"'+manifest['codec']+'\"','times':manifest['times'],'natural':name in ['sar_s1_p1_w160','sar_s2_p2_w320','sar_rotated_s2']})
else:raise ValueError(mode)
if len(sys.argv)>3:
 cases=[c for c in cases if c['name'] in sys.argv[3].split(',')]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for n in ['sha256.js','browser.js']:pg.add_script_tag(content=(R/'scripts'/n).read_text())
 fn=E/('browser_'+mode+'_'+route+'.json')
 out=json.loads(fn.read_text()) if fn.exists() else {}
 for cfg in cases:
  out[cfg['name']]=pg.evaluate('(c)=>probe(c)',cfg);save('browser_'+mode+'_'+route+'.json',out)
  x=out[cfg['name']];print(cfg['name'],x.get('error'),x.get('duration'),x.get('bufferedBeforeEOS'),len(x['checks']),x.get('ended'),x.get('playbackError'),flush=True)
 b.close()

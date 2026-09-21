# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
import base64,sys
stage=sys.argv[1] if len(sys.argv)>1 else 'first'
cases={'first':[('full_a',{'mode':'full','source':'a'}),('clip0_ref',{'mode':'full','source':'clip0'}),('clip0_window',{'mode':'clip','i':0})],
'rest':[('clip1_ref',{'mode':'full','source':'clip1'}),('clip1_window',{'mode':'clip','i':1}),('clip2_ref',{'mode':'full','source':'clip2'}),('clip2_window',{'mode':'clip','i':2}),('clip0_wrong',{'mode':'clip','i':0,'wrongOffset':True})],
'controls':[('clip2_extra_tail',{'mode':'clip','i':2,'extraTail':1}),('joined_wrong_boundary',{'mode':'join','wrongJoin':True})],
'live':[('joined_live',{'mode':'join-live'}),('joined_wrong',{'mode':'join','wrongOffset':True})],
'join':[('joined_ref',{'mode':'full','source':'joined'}),('joined_window',{'mode':'join'}),('joined_no_init',{'mode':'join-no-init'})]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 pg=b.new_page();pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode());pg.add_script_tag(content=(R/'scripts/audio.js').read_text());pg.evaluate('(m)=>window.audioManifest=m',json.loads((E/'audio_manifest.json').read_text()))
 out={}
 for name,arg in cases[stage]:
  o=pg.evaluate('(a)=>audioRun(a)',arg)
  if 'capture' in o:
   data=base64.b64decode(o.pop('capture'));filename=f'capture_{name}.f32';(E/filename).write_bytes(data);o['capture_file']=filename;o['capture_sha256']=sha(data)
  out[name]=o;save('browser_audio_'+stage+'.json',out);print(name,json.dumps(o)[:700],flush=True)
 b.close()

from common import *
from build import mp3_frames
import numpy as np,base64
from playwright.sync_api import sync_playwright
m=json.loads((E/'mp3_manifest.json').read_text());data=(F/m['source']).read_bytes();fs=mp3_frames(data)
for t in [20,73,145,210]:
 (F/f'mp3_prefix_{t}.mp3').write_bytes(data[:fs[t+7]['offset']])
fixed=lambda n:np.frombuffer(run(['ffmpeg','-v','error','-c:a','mp3','-i',F/n,'-f','s16le','-acodec','pcm_s16le','-']),dtype='<i2').reshape(-1,2)
full=fixed(m['source']);fixed_res=[]
for j in m['jobs']:
 if j['tag']!='plus1':continue
 a=fixed(j['file'])[j['candidate_offset']:j['candidate_offset']+j['count']];b=full[j['source_offset']:j['source_offset']+j['count']];fixed_res.append({'target':j['target_frame'],'differences':int(np.count_nonzero(a!=b)),'max_integer_error':int(np.max(abs(a.astype(int)-b)))})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page();page.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
 for n in ['sha256.js','browser_base.js','audio.js']:page.add_script_tag(content=(R/'scripts'/n).read_text())
 out=page.evaluate('''async(m)=>{const c=new OfflineAudioContext(2,1,48000),decode=async n=>c.decodeAudioData((await loadFile(n)).buffer),full=await decode(m.source),dup=await decode(m.source),o={full_repeat:[0,1].map(ch=>compare(full.getChannelData(ch),dup.getChannelData(ch))),prefix:[],window_repeat:[]};for(const j of m.jobs.filter(x=>x.tag==='plus1')){const pre=await decode('mp3_prefix_'+j.target_frame+'.mp3'),a=await decode(j.file),b=await decode(j.file);o.prefix.push({target:j.target_frame,bytes:(await loadFile('mp3_prefix_'+j.target_frame+'.mp3')).length,frames:pre.length,comparisons:[0,1].map(ch=>compare(pre.getChannelData(ch).subarray(j.source_offset,j.source_offset+j.count),full.getChannelData(ch).subarray(j.source_offset,j.source_offset+j.count)))});o.window_repeat.push({target:j.target_frame,comparisons:[0,1].map(ch=>compare(a.getChannelData(ch),b.getChannelData(ch)))});}return o;}''',m);out['host_fixed_decoder']=fixed_res;save('mp3_followup.json',out);print(json.dumps(out,indent=2));b.close()

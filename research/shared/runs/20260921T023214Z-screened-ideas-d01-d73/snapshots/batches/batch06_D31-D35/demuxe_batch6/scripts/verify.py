"""Evidence consistency checks; passing expected-negative checks are NOT route passes."""
from common import *
import numpy as np

def get(n):return json.loads((E/n).read_text())
checks=[]
def check(name,condition):checks.append({'name':name,'pass':bool(condition)})
op=get('opus_component.json');au=get('au_component.json');ed=get('edit_component.json');jx=get('jxl_component.json');browser=get('browser_decode.json');images=get('browser_images.json');life=get('browser_opuslife.json');alife=get('browser_aulife.json');elife=get('browser_editlife.json');sc=get('browser_schedule.json')
check('D31: 856 source packets',op['source_packets']==856)
check('D31: first 32 packets stay 2.5ms',op['variants']['adaptive']['packet_durations_samples'][:32]==[120]*32)
check('D31: adaptive count 135',op['variants']['adaptive']['packets']==135)
for name,d in op['variants'].items():
 for key in ['splitback_exact','host_opus_pcm_exact','host_webm_pcm_exact']:check('D31 '+name+' '+key,d[key])
 for ext in ['opus','webm']:check('D31 browser PCM '+name+'.'+ext,browser['opus'][name+'.'+ext]['comparison']['exact'])
 check('D31 MSE '+name+' lifecycle signal',life[name].get('ended') and len(life[name]['seeks'])==2 and life[name]['capture']['rms']>.05)
check('D31 wrong tail detected',not browser['opus']['wrong_tail.opus']['comparison']['exact'])
for k in ['wrong_config','unsupported_policy','empty_packet']:check('D31 rejection '+k,op[k]['rejected'])
check('D31 duration mismatch retained',life['unbatched']['duration']!=life['adaptive']['duration'])
for name,d in au.items():
 for k in ['payload_exact','host_pcm_exact','manual_oracle_exact','allcodes_host_exact']:check('D32 '+name+' '+k,d[k])
 check('D32 browser '+name+' whole PCM',browser[name]['comparison']['exact'])
 check('D32 all 256 symbols '+name,browser[name+'_allcodes']['comparison']['exact'])
 check('D32 wrong law detected '+name,not browser[name]['wrongLaw']['exact'])
 check('D32 stricter float boundary differs '+name,not browser[name+'_allcodes']['integerNormalized']['exact'])
 check('D32 direct AU rejected '+name,'error' in alife[name+'_source'])
 check('D32 WAVE native lifecycle '+name,alife[name+'_wrapped'].get('ended') and alife[name+'_wrapped']['capture']['rms']>.01)
 for k in ['unknown_length','truncation','unsupported']:check('D32 '+name+' '+k,d[k]['rejected'])
for codec,d in ed.items():
 for variant in ['single','double']:
  check('D33 '+codec+' '+variant+' mdat exact',d[variant]['mdat_exact'])
  check('D33 '+codec+' '+variant+' decoded equivalence rejected',not browser[codec+'_edits'][variant]['comparison']['exact'])
  check('D33 '+codec+' '+variant+' direct lifecycle not fidelity',elife[codec+'_'+variant].get('ended'))
 check('D33 bounds guard '+codec,d['bounds_negative']['rejected'])
 # compare actual host complete outputs against its own source windows; never hide mismatches.
 raw=np.frombuffer((F/(codec+'_source.f32')).read_bytes(),dtype='<f4')
 for v in ['single','double']:
  x=np.frombuffer((F/(codec+'_'+v+'.f32')).read_bytes(),dtype='<f4');expected=np.concatenate([raw[a:z] for a,z in d[v]['windows']]);n=min(len(x),len(expected))
  d[v]['host_compared']=n;d[v]['host_mismatches']=int(np.count_nonzero(x[:n]!=expected[:n]))
save('edit_component_analysis.json',ed)
for name,d in jx['cases'].items():
 check('D34 byte-exact '+name,d['jpeg_exact'] and (F/(name+'.jpg')).read_bytes()==(F/(name+'_recovered.jpg')).read_bytes())
 check('D34 actual browser comparison '+name,images[name+'.jpg']==images[name+'_recovered.jpg'])
 check('D34 original JXL rejected '+name,'error' in images[name+'.jxl'])
 for neg in ['no_recon','truncated','output_cap']:check('D34 '+name+' '+neg,d[neg]['rejected'])
for codec in ['aac','flac']:
 for v in ['single','double']:
  check('D35 exact rendered '+codec+' '+v,sc[codec+'_'+v+'_False']['comparison']['exact'])
  check('D35 wrong sample origin detected '+codec+' '+v,not sc[codec+'_'+v+'_True']['comparison']['exact'])
  check('D35 same source buffer '+codec+' '+v,sc[codec+'_'+v+'_False']['sourceBufferShared'])
for name,d in sc['guards'].items():check('D35 guard '+name,d['rejected'])
result={'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'checks':checks,'qualification':{'D31':'whole-file component pass; MSE tail mismatch; no performance gate','D32':'finite browser WAVE route pass relative to browser PCM-WAV; stricter /32768 contract differs; MSE unavailable for tested MIME','D33':'exact whole-file edit route failed; direct-element exactness unqualified','D34':'host JPEG reconstruction plus browser image identity pass; Wasm reconstruction untested','D35':'offline native audio scheduling exact; live/streaming ownership untested'}}
save('verification.json',result)
print(json.dumps({k:v for k,v in result.items() if k!='checks'},indent=2))
if result['failed']:raise SystemExit(1)

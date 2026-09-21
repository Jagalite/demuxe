"""Cross-check bounded observations; assertion counts are NOT experiment counts."""
from pathlib import Path
import json,hashlib,ast,subprocess,platform,datetime
R=Path(__file__).resolve().parents[1];E=R/'evidence';F=R/'fixtures'
def read(n):return json.loads((E/n).read_text())
m=read('manifest.json');c=read('component.json');routes=read('browser_routes.json');direct=read('browser_direct.json');comb=read('browser_combinations.json');audio=read('browser_audio.json');audible=read('browser_audible.json');cancel=read('browser_cancellation.json')['cases'];checks=[]
def check(name,result):checks.append({'name':name,'passed':bool(result)})
check('AAC exact canonical round-trip',c['aac']['restored_control_exactly'])
check('AAC no approximation of 48001 Hz',c['aac']['rate_guard_rejected'])
check('AAC truncation negatives',all(c['aac']['truncations_rejected']))
check('AAC media payload unchanged',m['explicit_rate.mp4']['mdat_hashes']==m['control.mp4']['mdat_hashes'])
check('AAC timing and sample tables unchanged',m['explicit_rate.mp4']['moof_hashes']==m['control.mp4']['moof_hashes'])
check('explicit AAC rejected at actual MSE audio initialization',not routes['explicit_rate.mp4'].get('ended') and 'audio decoder' in routes['explicit_rate.mp4'].get('error',''))
for name in ['control.mp4','canonical_rate.mp4','relative.mp4','inferred_tfdt.mp4']:
 check(name+' MSE seeks and EOF',routes[name].get('ended') and len(routes[name].get('captures',[]))==4)
 check(name+' same presented-frame witnesses',[x['hash'] for x in routes[name].get('captures',[])]==[x['hash'] for x in routes['control.mp4'].get('captures',[])])
 check(name+' real streaming channel tones',audible[name+':mse']['audioDetected'] and audible[name+':mse']['correctChannelTones'])
for name in ['absolute.mp4','missing_tfdt.mp4','bad_offset.mp4']:
 check(name+' destination rejects negative',not routes[name].get('ended') and bool(routes[name].get('error')))
check('absolute rebasing same size',c['relative']['same_file_size'])
check('absolute rebase changes 120 byte values',c['relative']['changed_byte_values']==120)
check('missing-time source payloads poisoned',c['time_inference']['erased_timestamp_payloads_poisoned'])
check('duration inference restores complete original file',c['time_inference']['restored_control_exactly'])
check('continuity proof negative controls',all(c['time_inference']['reject_controls'].values()))
for pair,v in c['equivalence'].items():
 if 'explicit_rate.mp4' not in pair:check(pair+' all host witnesses identical',all(x is True for x in v.values()))
for left,right in [('control.mp4','canonical_rate.mp4'),('absolute.mp4','relative.mp4'),('control.mp4','inferred_tfdt.mp4'),('absolute.mp4','compound_7.mp4')]:
 check(left+' vs '+right+' browser whole-file audio exact',audio[left]['sha256']==audio[right]['sha256'] and audio[left]['frames']==audio[right]['frames'])
check('compound only all three repairs passes',[i for i in range(8) if comb[str(i)].get('ended')]==[7])
check('compound video witnesses match',[x['hash'] for x in comb['7']['captures']]==[x['hash'] for x in routes['control.mp4']['captures']])
check('compound real streaming channel tones',audible['compound_7.mp4:mse']['audioDetected'] and audible['compound_7.mp4:mse']['correctChannelTones'])
for x in cancel:
 check(x['mode']+' retained buffers released',x['retainedAfter']==0)
 if x['mode']=='normal':check('normal verified packet publishes',x['guardCommitted']==2937 and x['digest']==x['expectedHash'])
 elif x['mode']=='bad_checksum':check('corrupt packet never commits',not x['validated'] and x['guardCommitted']==0)
 else:
  check(x['mode']+' suppresses stale/cancelled valid output',x['validated'] and x['naiveCommitted']==2937 and x['guardCommitted']==0)
  if x['mode'].startswith('supersede'):check(x['mode']+' replacement finishes before stale output',x['replacementCommitted']==2937 and x['replacementHash']==x['expectedHash'])
check('video-only gate falsely accepts explicit AAC source',direct['explicit_rate.mp4'].get('ended') and len(direct['explicit_rate.mp4']['captures'])==4)
check('real output exposes missing requested audio',not audible['explicit_rate.mp4:direct']['audioDetected'] and audible['explicit_rate.mp4:direct']['peak']==[0,0] and audible['explicit_rate.mp4:direct']['mediaError'] is None)
for name in ['absolute.mp4','missing_tfdt.mp4']:
 check(name+' direct route already exists',direct[name].get('ended') and audible[name+':direct']['correctChannelTones'])
# Parse container durations as well as FFprobe summaries.
tree=ast.parse((R/'scripts/build.py').read_text());ns={};exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef))],type_ignores=[]),'build_helpers','exec'),ns)
timing={}
for name in ['control.mp4','absolute.mp4','relative.mp4','compound_7.mp4']:
 b=(F/name).read_bytes();defaults=ns['track_defaults'](b);rows=[]
 for ix,z in enumerate(ns['fragments'](b)):
  for tr in ns['boxes'](b,z[1]+8,z[1]+z[2]):
   if tr[0]!='traf':continue
   tid,total,count=ns['info'](b,tr,defaults);tf=ns['child'](b,tr,'tfdt');start=int.from_bytes(b[tf[1]+12:tf[1]+tf[2]],'big');rows.append({'fragment':ix,'track':tid,'start':start,'duration_sum':total,'samples':count,'end':start+total})
 timing[name]=rows
(E/'remux_timing_crosscheck.json').write_text(json.dumps(timing,indent=2))
check('control remux packet summaries match',m['control.mp4']['packets']==m['absolute.mp4']['packets'])
check('control remux compressed payloads match',m['control.mp4']['mdat_hashes']==m['absolute.mp4']['mdat_hashes'])
check('control remux changes actual audio end by 512 ticks',timing['absolute.mp4'][-1]['end']-timing['control.mp4'][-1]['end']==512)
check('control remux whole-file browser output differs by 512 frames',audio['absolute.mp4']['frames']-audio['control.mp4']['frames']==512)
check('metadata-only adapters retain own source container timing',timing['absolute.mp4']==timing['relative.mp4']==timing['compound_7.mp4'])
result={'all_passed':all(x['passed'] for x in checks),'assertion_count':len(checks),'passed':sum(x['passed'] for x in checks),'failed':[x for x in checks if not x['passed']],'checks':checks,'note':'Assertions cross-check six related research questions; not six qualified routes or this many experiments.'}
(E/'verification.json').write_text(json.dumps(result,indent=2))
env={'run_time_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'platform':platform.platform(),'python':platform.python_version(),'ffmpeg':subprocess.run(['ffmpeg','-version'],capture_output=True,text=True).stdout.splitlines()[0],'chromium':subprocess.run(['chromium','--version'],capture_output=True,text=True).stdout.strip(),'source_repo_commit':'01611bdaa2d9a21903bd2f1086fe0d786df6d5d1','execution':'Standalone synthetic fixture prototypes, not Demuxe runtime','navigation_block':'Loopback navigation trial returned ERR_BLOCKED_BY_ADMINISTRATOR. Tests used allowed in-memory page binding.','limitations':['No secure-context WebCodecs','No physical audio output qualification','No hardware decoding or power/CPU measurement','No real network range/latency tests','No application integration','Host and browser decoders may share FFmpeg ancestry']}
(E/'environment.json').write_text(json.dumps(env,indent=2))
print(json.dumps({k:v for k,v in result.items() if k!='checks'},indent=2));assert result['all_passed']

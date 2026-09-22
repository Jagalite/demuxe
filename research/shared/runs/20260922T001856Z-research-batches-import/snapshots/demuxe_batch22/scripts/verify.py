# SPDX-License-Identifier: MIT
from common import *
import numpy as np

def load(n):return json.loads((E/n).read_text())
def pic_eq(a,b):return a['sha256']==b['sha256'] and a['width']==b['width'] and a['height']==b['height']
def seek_equal(a,b):
 return len(a)==len(b) and all(pic_eq(x['picture'],y['picture']) and x.get('frame') is not None and y.get('frame') is not None and abs(x['frame']['mediaTime']-y['frame']['mediaTime'])<1e-7 for x,y in zip(a,b))
def differing_checks(a,b):return sum(not pic_eq(x['picture'],y['picture']) or (x.get('frame') and y.get('frame') and abs(x['frame']['mediaTime']-y['frame']['mediaTime'])>1e-7) for x,y in zip(a,b))
def main():
 tests=[]
 def check(name,v,detail=None):tests.append({'name':name,'passed':bool(v),'detail':detail})
 m=load('manifest.json');av=load('browser_av.json');split=load('browser_av_split.json');led=load('browser_ledger.json');v0=load('browser_ledger_v0.json');whole=load('browser_whole_audio.json')
 analysis={'D86':{},'D87':{},'D88':{},'limitations':[]}
 for name,x in m['layouts'].items():
  for key in ['packet_identity','raw_sample_table_identity','video_decoded_exact','audio_decoded_exact']:check(name+' '+key,x[key])
  check(name+' all 217 packets',x['packet_count']==217)
  check(name+' ffprobe reporting diagnostic scoped correctly', (x['all_ffprobe_fields_equal'] and not x['ffprobe_field_differences']) if name=='grouped' else (not x['all_ffprobe_fields_equal'] and len(x['ffprobe_field_differences'])==1))
 check('whole browser PCM all sources equal',whole[0]['sha256']==whole[1]['sha256']==whole[2]['sha256'])
 check('whole browser sample lengths identical',whole[0]['frames']==whole[1]['frames']==whole[2]['frames']==145023)
 base=av['grouped_full'];gold=av['interleaved_full'];index={round(x['time']*1e6):x['picture'] for x in gold['frames']};early=[]
 for name,x in (av|split).items():
  check(name+' reaches EOF',x.get('ended') and not x.get('error'))
  check(name+' exact seven seek pictures/timestamps',seek_equal(x['checks'],base['checks']))
  check(name+' duration matches baseline',abs(x['duration']-base['duration'])<1e-9)
  check(name+' cleanup',x['cleaned'])
  common=[f for f in x['frames'] if round(f['time']*1e6) in index]
  same=sum(pic_eq(f['picture'],index[round(f['time']*1e6)]) for f in common)
  check(name+' all shared continuous captures exact',len(common)>0 and same==len(common),{'common':len(common),'matching':same,'not_in_reference':len(x['frames'])-len(common)})
  if name=='split_partial':early=[f for f in common if f['beforeTail']]
  # Frequency witnesses; these do not establish exact audio output, boundaries, or A/V sync.
  a=np.fromfile(E/x['audio']['file'],dtype='<f4').reshape(-1,2);nz=np.flatnonzero(np.max(abs(a),axis=1)>1e-5);start=(int(nz[0])+256) if len(nz) else 0;n=8192
  peaks=[]
  if start+n<=len(a):
   for c in range(2):
    s=abs(np.fft.rfft(a[start:start+n,c]*np.hanning(n)));peaks.append(float(np.fft.rfftfreq(n,1/48000)[int(np.argmax(s))]))
  x['frequencyWitnessHz']=peaks
  check(name+' two requested channel tone witnesses',len(peaks)==2 and abs(peaks[0]-503)<12 and abs(peaks[1]-941)<12,peaks)
 for name in ['grouped_partial','interleaved_partial']:
  p=av[name]['beforeTail'];check(name+' no pre-tail playback',p['time']==0 and p['firstAudio'] is None and p['frameCount']==0 and p['buffered']==[])
 p=split['split_partial']['beforeTail'];check('split starts both tracks before tail',p['time']>.15 and p['frameCount']>2 and p['firstAudio'] and p['firstAudio']['beforeTail'])
 check('split early pictures match complete input',len(early)>2 and all(pic_eq(f['picture'],index[round(f['time']*1e6)]) for f in early))
 p=split['split_video_only_head']['beforeTail'];check('withheld-audio control does not advance',p['time']==0 and p['firstAudio'] is None and p['buffered']==[])
 for t in m['split']:check(t['kind']+' host output unchanged',t['host_decoded_matches_source'])
 # Ledger:
 ref=led['reference'];good=['duplicates_reference','duplicates_guarded','evict_guarded','abort_guarded','epoch_guarded','overwrite_reference','overwrite_guarded','pending_aba_reference','pending_aba_guarded']
 for name in good:
  x=led[name];check(name+' correct seven requested outputs',seek_equal(x['checks'],ref['checks']))
  check(name+' complete retained coverage and EOF',x.get('ended') and x['finalCoverage']==[[0,3]] and x['cleaned'])
 check('repeat guard matches repeated-presentation oracle',seek_equal(led['repeat_guarded']['checks'],led['repeat_reference']['checks']))
 check('repeat actually differs from original second interval',differing_checks(led['repeat_reference']['checks'],ref['checks'])>0)
 check('identical requests coalesce',led['duplicates_guarded']['counts']=={'requests':9,'mediaAppends':3,'bytes':59931,'pendingJoins':3,'committedSkips':3,'aborts':0})
 check('unfiltered duplicate control submits all',led['duplicates_reference']['counts']['mediaAppends']==9 and led['duplicates_reference']['counts']['bytes']==179793)
 check('byte-only repeat control fails',led['repeat_naive'].get('error') and led['repeat_naive']['finalCoverage']==[[0,1],[2,3]])
 check('byte-only evict control fails',led['evict_naive'].get('error') and led['evict_naive']['finalCoverage']==[[1,3]])
 check('abort not committed as success',led['abort_guarded'].get('abortRejected') and led['abort_guarded']['counts']['aborts']==1)
 fails={}
 for name,x in v0.items():
  d=differing_checks(x['checks'],ref['checks']);fails[name]={'wrong_seek_outputs':d,'checks':len(x['checks']),'ended':x.get('ended'),'coverage':x.get('finalCoverage'),'counts':x['counts']}
  check(name+' false success detected',d>0 and x.get('ended') and x['finalCoverage']==[[0,3]],fails[name])
 check('replacement guard must reappend A',led['overwrite_guarded']['counts']['mediaAppends']==5)
 check('pending A-B-A guard must not coalesce across B',led['pending_aba_guarded']['counts']['mediaAppends']==5)
 analysis['D86']={'source':{'bytes':m['source_bytes'],'tracks':m['tracks']},'layouts':m['layouts'],'whole_browser_frames':whole[0]['frames'],'whole_browser_channels':2,'whole_browser_sha256':whole[0]['sha256'],'partial_grouped':av['grouped_partial']['beforeTail'],'partial_interleaved':av['interleaved_partial']['beforeTail']}
 analysis['D87']={'track_fragments':m['split'],'head_media_bytes':sum(t['head'] for t in m['split']),'head_init_bytes':sum((F/t['init']).stat().st_size for t in m['split']),'retained_early_video_checks':len(early),'pre_tail':split['split_partial']['beforeTail'],'audio_held_control':split['split_video_only_head']['beforeTail'],'seven_seek_checks_per_arm':True,'channel_tone_frequencies':split['split_partial']['frequencyWitnessHz']}
 analysis['D88']={'request_counts':{k:x['counts'] for k,x in led.items()},'v0_false_successes':fails,'validated_fragment_source':'host-pinned fixture handles','full_pixel_scanout_qualified':False}
 analysis['limitations']=['Standalone components, not maintained Demuxe/Shaka execution.','No CPU/energy/physical memory/decoder acceleration measurement.','Head availability is an authored 500-ms pause, not an actual network benchmark. Full source acquired/indexed in advance.','Source initial AAC duration omitted by ffprobe in one layout; underlying tfhd/trun duration is unchanged at 1024 ticks. Diagnostic retained; no all-fields equality claim.','Host and whole-file browser PCM are equivalent within each endpoint, not across decoders. Source priming/tail relative to authored pre-encode samples is not newly qualified.','Live ScriptProcessor captures are diagnostic and contain nonexact sequence comparisons; tone detection does not certify gaplessness or sample-exact A/V synchronization.','Ledger accepts prevalidated immutable fragment handles and conservative known closed-GOP intervals. Not a general integrity or transport layer. No production hit-rate, cancellation fan-out, automatic eviction or cross-codec admission qualification.','Pixel captures are offscreen Canvas observations, not physical scanout or smoothness.']
 save('analysis.json',analysis);save('verification.json',{'passed':sum(t['passed'] for t in tests),'total':len(tests),'checks':tests})
 print('PASS',sum(t['passed'] for t in tests),'/',len(tests))
 for t in tests:
  if not t['passed']:print('FAILED',t)
 print(json.dumps({'D87':analysis['D87'],'v0':fails},indent=2))
 if not all(t['passed'] for t in tests):raise SystemExit(1)
if __name__=='__main__':main()

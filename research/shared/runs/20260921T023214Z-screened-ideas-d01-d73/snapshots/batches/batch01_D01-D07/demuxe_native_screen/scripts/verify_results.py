"""Cross-check recorded results and emit machine-readable assertions, not performance gates."""
from __future__ import annotations
import json,hashlib,subprocess,platform,sys,datetime,os,shutil
from pathlib import Path
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence'
def read(name):return json.loads((E/name).read_text())
m=read('manifest.json');checks={};measure={};cmds=[]
def check(k,v):
 checks[k]=bool(v)
 if not v:raise AssertionError(k)
def boxes(b):
 p=0
 while p<len(b):
  n=int.from_bytes(b[p:p+4],'big');assert n>=8 and p+n<=len(b)
  yield b[p+4:p+8],p,n;p+=n

def packet_records(name):
 cmd=['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(F/name)]
 p=subprocess.run(cmd,capture_output=True,timeout=10);cmds.append({'argv':cmd,'returncode':p.returncode,'stderr':p.stderr.decode()});assert p.returncode==0
 return [(x['pts'],x['dts'],x.get('duration'),x['data_hash']) for x in json.loads(p.stdout)['packets'] if x['stream_index']==0]
a=(F/'av_alac.mp4').read_bytes();origpk=packet_records('av_alac.mp4')
proj=read('browser_projection.json');basecaptures=proj['video_control']['captures']
for mask in [5,7]:
 b=(F/f'project_{mask}.mp4').read_bytes()
 ma=[b[p:p+n] for t,p,n in boxes(b) if t==b'mdat'];mb=[a[p:p+n] for t,p,n in boxes(a) if t==b'mdat']
 check(f'projection_{mask}_whole_mdat_equal',ma==mb);check(f'projection_{mask}_filesize_equal',len(a)==len(b))
 check(f'projection_{mask}_video_packets_timing_exact',packet_records(f'project_{mask}.mp4')==origpk)
 check(f'projection_{mask}_browser_seek_pixels_exact',proj[str(mask)]['captures']==basecaptures)
 check(f'projection_{mask}_browser_eof',proj[str(mask)].get('ended'))
 measure[f'projection_{mask}']={'changed_byte_values':sum(x!=y for x,y in zip(a,b)),
   'tag_write_bytes':sum(len(m['patch_locations'][k])*4 for i,k in enumerate(['trak','trex','traf']) if mask&(1<<i)),
   'file_bytes':len(b),'video_packet_count':len(origpk)}
passed=[i for i in range(8) if proj[str(i)].get('ended')];check('projection_subset_outcomes',passed==[5,7])
measure['subset_search']={'browser_accepting_masks':passed,'minimal_accepting_masks':[i for i in passed if not any(j!=i and j&i==j for j in passed)],
  'conformance_warning':'Mask 5 retains orphan audio trex; browser acceptance does not certify ISO BMFF conformance. Prefer coherent mask 7 for next qualification.'}
for n in ['project_7.mp4','width_2.mp4','width_4.mp4','av_flac.mp4']:
 check(n+'_host_all_video_frames_exact',m['files'][n]['host_frame_hashes']==m['files']['video.mp4']['host_frame_hashes'])

def nal_units(name,width):
 b=(F/name).read_bytes();result=[]
 for pk in m['files'][name]['packets']:
  x=b[pk['offset']:pk['offset']+pk['size']];p=0;units=[]
  while p<len(x):
   n=int.from_bytes(x[p:p+width],'big');p+=width;assert n and p+n<=len(x)
   units.append(x[p:p+n]);p+=n
  result.append(units)
 return result
check('width_2_4_NAL_identity',nal_units('width_2.mp4',2)==nal_units('width_4.mp4',4))
w=read('browser_widths.json');check('width_2_4_browser_pixels',w['width_2.mp4']['captures']==w['width_4.mp4']['captures'])
check('width_2_4_eof',w['width_2.mp4'].get('ended') and w['width_4.mp4'].get('ended'))
check('width_mismatch_negative_rejected',not w['width_mismatch.mp4'].get('ended') and bool(w['width_mismatch.mp4'].get('error')))
measure['widths']={'nals':49,'frames':48,'payload_difference_bytes':98,'gain_percent':None}
au=read('browser_audio.json');check('flac_sixch_24bit_exact',au['native_exact_48000']['exact'])
check('flac_wrong_clock_rejected_by_exact_oracle',not au['wrong_clock_control_44100']['exact'])
check('flac_mse_video_eof',au['combined_mse'].get('ended'));check('flac_mse_video_seek_pixels',au['combined_mse']['captures']==basecaptures)
measure['flac']={'channels':6,'frames_per_channel':au['native_exact_48000']['frames'],'individual_samples':6*au['native_exact_48000']['frames'],
 'wrong_clock_frames':au['wrong_clock_control_44100']['frames'],'end_to_end_surround':'UNQUALIFIED','encoding_cost':'UNMEASURED'}
pce=read('pce_component.json');bp=read('browser_pce.json')
check('pce_packet_identity',pce['packets_identical']);check('pce_host_pcm_identity',pce['host_pcm_exact'])
check('pce_multichannel_guard',not pce['multichannel_guard_control']['admitted'])
check('pce_original_mse_fails',not bp['av_pce.mp4'].get('ended') and bool(bp['av_pce.mp4'].get('error')))
check('pce_canonical_mse_eof',bp['av_pce_canonical.mp4'].get('ended'))
for name in ['av_pce.mp4','av_pce_canonical.mp4']:
 check('pce_'+name+'_browser_audio_exact_host',bp[name+':audio']['float32_sha256']==pce['host_pcm_sha256'] and bp[name+':audio']['frames']==pce['host_pcm_frames'])
check('pce_video_seek_pixels',bp['av_pce_canonical.mp4']['captures']==basecaptures)
measure['pce']={'all_packets':pce['packet_count'],'audio_packets':pce['packet_count']-48,'video_packets':48,
  'pcm_frames_per_channel':pce['host_pcm_frames'],'pcm_individual_samples':2*pce['host_pcm_frames'],
  'changed_byte_values':pce['changed_byte_values'],'esds_before':pce['esds_bytes_before'],'esds_after':pce['esds_bytes_after'],
  'native_streaming_audio_seek_fidelity':'UNQUALIFIED'}
i=read('browser_inflate.json');valid=[x for k,x in i.items() if k.startswith('packet.zlib:')];bad=[x for k,x in i.items() if k!='environment' and not k.startswith('packet.zlib:')]
check('inflate_valid_all_exact',len(valid)==3 and all(x['exact'] for x in valid))
check('inflate_negatives_all_rejected',len(bad)==9 and all(not x['ok'] for x in bad))
check('inflate_negatives_publish_zero',all(x['transactionallyPublishedBytes']==0 for x in bad))
check('inflate_quarantine_cap',all(x['retainedBytes']<=65536 for x in bad+valid))
measure['inflate']={'valid_cases':3,'negative_cases':9,'packet_bytes':2937,'quarantine_cap_bytes':65536,
  'max_observed_retained':max(x['retainedBytes'] for x in bad+valid),'native_internal_allocation':'UNMEASURED',
  'checksum_note':'zlib uses Adler-32; older fixture filename bad_crc is a historical misnomer.'}
isle=read('island_component.json');bi=read('browser_islands.json')
check('island_host_prefix_suffix',isle['prefix_exact_original'] and isle['suffix_exact_original'])
check('island_mse_prefix_suffix_eof',bi['prefix'].get('ended') and bi['suffix'].get('ended'))
check('island_mpeg2_browser_declines',bi['middle_native']['supported']==False)
refs={x['t']:x['hash'] for x in bi['full_reference']['captures']}
for k in ['prefix','suffix']:check('island_'+k+'_seek_pixels',all(refs[x['t']]==x['hash'] for x in bi[k]['captures']))
measure['islands']={'native_prefix_frames':12,'software_middle_frames':12,'native_suffix_frames':24,
  'continuous_handoff':'NOT RUN','audio_clock':'NOT RUN','hardware':'UNQUALIFIED',
  'high444_negative_assumption':'Initial candidate was also browser-playable; it was not a useful unsupported-section fixture.'}
env={'recorded_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_commit':m['source_commit'],
 'python':sys.version,'platform':platform.platform(),'ffmpeg':subprocess.check_output(['ffmpeg','-version']).decode().splitlines()[0],
 'chromium':subprocess.check_output([os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('google-chrome') or '/usr/bin/chromium','--version']).decode().strip(),'browser_context':bp['environment'],
 'git_clone':'FAILED: DNS unavailable. GitHub connector used for source-document review; no working tree pulled.',
 'demuxe_runtime_executed':False,'gpu_device_present':Path('/dev/dri').exists(),'performance_gate':'NOT RUN'}
(E/'environment.json').write_text(json.dumps(env,indent=2));(E/'verification_commands.json').write_text(json.dumps(cmds,indent=2))
result={'assertion_count':len(checks),'all_assertions_passed':all(checks.values()),'assertions':checks,'measurements':measure,
 'qualification':'Bounded component checks only; not full player correctness/performance acceptance.'}
(E/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))

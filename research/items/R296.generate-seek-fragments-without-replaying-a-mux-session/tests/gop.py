# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,struct,hashlib
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T212400Z-dependent-gop';r.mkdir(exist_ok=False);source=r/'source.mp4';commands=[]
def call(args,check=True):
 commands.append(args);p=subprocess.run(args,capture_output=True);(r/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
 if check and p.returncode:raise ValueError(p.stderr.decode())
 return p
call(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=160x96:r=24:d=4','-c:v','libx264','-g','24','-keyint_min','24','-sc_threshold','0','-bf','2','-movflags','frag_keyframe+empty_moov+default_base_moof+negative_cts_offsets',str(source)])
b=source.read_bytes();identity=hashlib.sha256(b).hexdigest();probe=json.loads(call(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(source)]).stdout);packets=probe['packets'];frames=json.loads(call(['ffprobe','-v','error','-show_frames','-select_streams','v','-of','json',str(source)]).stdout)['frames'];full=call(['ffmpeg','-v','error','-i',str(source),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']).stdout;framebytes=160*96*3//2;assert len(full)==len(frames)*framebytes
p=0
while b[p+4:p+8]!=b'moof':p+=int.from_bytes(b[p:p+4],'big')
init=b[:p]
def box(t,payload):return struct.pack('>I4s',8+len(payload),t)+payload
def construct(index,version,omit_preroll=False):
 if version!=identity:raise ValueError('identity')
 if not 0<=index<len(packets):raise ValueError('ordinal')
 first=max(i for i in range(index+1) if 'K' in packets[i]['flags']);first=index if omit_preroll else first;chosen=packets[first:index+1];payload=b''.join(b[int(q['pos']):int(q['pos'])+int(q['size'])] for q in chosen)
 def moof(offset):
  entries=b''.join(struct.pack('>IIIi',int(q['duration']),int(q['size']),0x02000000 if 'K' in q['flags'] else 0x01010000,int(q['pts'])-int(q['dts'])) for q in chosen)
  return box(b'moof',box(b'mfhd',struct.pack('>II',0,1))+box(b'traf',box(b'tfhd',struct.pack('>II',0x20000,1))+box(b'tfdt',struct.pack('>IQ',0x1000000,int(chosen[0]['dts'])))+box(b'trun',struct.pack('>IIi',0x1000f01,len(chosen),offset)+entries)))
 m=moof(0);return init+moof(len(m)+8)+box(b'mdat',payload),chosen
results=[]
for n,index in enumerate([73,4,74,4]):
 data,chosen=construct(index,identity);file=r/f'seek-{n}.mp4';file.write_bytes(data);got=json.loads(call(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(file)]).stdout)['packets'];assert len(got)==len(chosen)
 for x,y in zip(got,chosen):
  assert all(x[k]==y[k] for k in ['pts','dts','duration','data_hash'])
 raw=call(['ffmpeg','-v','error','-i',str(file),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']).stdout;timestamps={q['pts'] for q in chosen};expected=b''.join(full[i*framebytes:(i+1)*framebytes] for i,f in enumerate(frames) if int(f['best_effort_timestamp']) in timestamps);assert raw==expected
 results.append(dict(index=index,copiedPackets=len(chosen),decodedFrames=len(raw)//framebytes,sha256=hashlib.sha256(data).hexdigest(),pixelSHA256=hashlib.sha256(raw).hexdigest(),completePictureOracleExact=True))
assert results[1]['sha256']==results[3]['sha256'];bad,chosen=construct(73,identity,True);(r/'bad-no-preroll.mp4').write_bytes(bad);decoded=call(['ffmpeg','-v','error','-i',str(r/'bad-no-preroll.mp4'),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],False);assert decoded.returncode or not decoded.stdout;controls=[]
for i,v in [(96,identity),(-1,identity),(4,'stale')]:
 try:construct(i,v);raise AssertionError('accepted')
 except ValueError:controls.append(dict(index=i,identity=v,rejected=True))
(r/'results.json').write_text(json.dumps(dict(passed=True,sourceSamples=len(packets),nonSyncSamples=sum('K' not in q['flags'] for q in packets),negativeCompositionOffsets=any(q['pts']<q['dts'] for q in packets),requests=results,controls=controls,actualOmittedPreroll=dict(exit=decoded.returncode,bytes=len(decoded.stdout),stderr=decoded.stderr.decode()),scope='Source-bound stateless video-only AVC fragment constructor including preceding realRAP and dependent/B-frame packets, signed composition offsets. Full host pixels and payload/timing oracle. No browser admission or external live source lifecycle.'),indent=2)+'\n');print((r/'results.json').read_text())

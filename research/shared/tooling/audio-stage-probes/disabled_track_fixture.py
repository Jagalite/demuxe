# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys,hashlib,re,time,statistics
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);cmds=[]
def call(a):cmds.append(a);return subprocess.run(a,check=True,capture_output=True)
base=['ffmpeg','-v','error','-y'];call(base+['-i','research/shared/runs/20260919T214510Z-mixed-tracks/red.mp4','-i','research/shared/runs/20260919T215152Z-quantized-flac/source.ac3','-map','0:v','-map','1:a','-c','copy',str(p/'source.mkv')]);(p/'protocol.json').write_text(json.dumps({'item':'R013.treat-intentionally-disabled-tracks-as-removable-work','scope':'Research-only explicit selected stream policy: disabled audio emits video only and no audio decode/encode; muted keeps ordinary audio adaptation; audio-only excludes video; reenable rebuild from same source at RAP0/seek1.0. No production sentinel change.','correctness':'Video packet identities exact; disabled output lacks audio, actual FFmpeg counters no decoderframes versus positive mutedcontrol; native owner seek/EOF and boundedreenable; late actual completed preparation cannot publish after epoch change; source mismatch rejects.','performance':'After correctness,5alternating full host preparation pairs disabled versus mutedFLACadaptation; <=0.9 cost or eliminated decoded/encoded audio work primary. Browser nativeplay/seek independent; endtoend browser speed not inferred.'},indent=2))
def prep(mode,dest):
 args=['ffmpeg','-v','debug','-y','-i',str(p/'source.mkv')]
 if mode=='disabled':args+=['-map','0:v:0','-c:v','copy','-an']
 elif mode=='audio-only':args+=['-map','0:a:0','-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24','-vn']
 else:args+=['-map','0:v:0','-map','0:a:0','-c:v','copy','-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24']
 args+=['-strict','experimental','-movflags','frag_keyframe+empty_moov+default_base_moof',str(dest)];r=call(args);return r.stderr.decode()
for mode in ['disabled','muted','audio-only']:(p/(mode+'.log')).write_text(prep(mode,p/(mode+'.mp4')))
def hashes(file):
 data=json.loads(call(['ffprobe','-v','error','-select_streams','v','-show_packets','-show_data_hash','sha256','-of','json',str(file)]).stdout);return [x['data_hash'] for x in data['packets']]
source=hashes(p/'source.mkv');assert source==hashes(p/'disabled.mp4')==hashes(p/'muted.mp4')
r={'sourceSHA256':hashlib.sha256((p/'source.mkv').read_bytes()).hexdigest(),'videoPacketCount':len(source),'copiedVideoExact':True,'logs':{}}
for mode in ['disabled','muted','audio-only']:
 s=(p/(mode+'.log')).read_text();r['logs'][mode]=[line for line in s.splitlines() if 'frames decoded' in line or 'frames encoded' in line or 'frames successfully decoded' in line]
(p/'host-correctness.json').write_text(json.dumps(r,indent=2));(p/'commands.log').write_text('\n'.join(map(json.dumps,cmds))+'\n');print(r)

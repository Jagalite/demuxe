# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,sys,json,time,statistics,array
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);commands=[]
def call(a):commands.append(a);return subprocess.check_output(a,stderr=subprocess.DEVNULL)
b=['ffmpeg','-v','error','-y']
for name,hz,bits in [('a',220,16),('b',440,24)]:
 expr=f'aevalsrc=0.06*sin(2*PI*{hz}*t)+if(between(t\\,0.3\\,0.5)\\,0.2*sin(2*PI*1760*t)\\,0):s=48000:d=2'
 call(b+['-f','lavfi','-i',expr,'-c:a','flac','-sample_fmt','s16' if bits==16 else 's32','-bits_per_raw_sample',str(bits),str(p/(name+'.flac'))])
def prep(stable):
 for name in ['a','b']:
  call(b+['-i',str(p/(name+'.flac')),'-c:a','flac' if stable else 'copy']+(['-sample_fmt','s32','-bits_per_raw_sample','24'] if stable else [])+['-strict','experimental','-movflags','frag_keyframe+empty_moov+default_base_moof',str(p/(('stable-' if stable else 'native-')+name+'.mp4'))])
prep(False);prep(True);identities=[]
for name in ['a','b']:
 source=call(['ffmpeg','-v','error','-i',str(p/(name+'.flac')),'-f','s32le','-'])
 for route in ['native','stable']:
  actual=call(['ffmpeg','-v','error','-i',str(p/(route+'-'+name+'.mp4')),'-f','s32le','-']);assert actual==source;identities.append({'track':name,'route':route,'frames':len(source)//4,'integerPCMExact':True})
(p/'protocol.json').write_text(json.dumps({'item':'R016.keep-a-stable-audio-output-format-through-frequent-switches','scope':'Compatible integerFLAC16/24 source profiles at48kmono, distinct220/440Hz trackidentity and1760Hz timingmarkers. Common24bit promotion exact. Native baseline sameFLACcodec with changingprecision configuration, not broadheterogeneouscodecqualification.3tracksegments0/2/4s; copiedH264video continuous.','correctness':'Hosteveryinteger sampleexact; actualMediaElementSourcePCM markeralignment50ms, gap<=5ms, preserved distinct220/440Hz selectedtrackidentity, picture/seek/EOF/owner/abortcontrols.','performance':'After correctness,5alternating complete host prepare nativecopy versus stable decode/encode24bit plus matchedbrowser creation/appends/cleanup; candidate<=1.10baseline; perappend latency separate. No inference of actual decoderinstance reuse from config stability.'},indent=2));(p/'integer-identity.json').write_text(json.dumps(identities,indent=2));(p/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n')

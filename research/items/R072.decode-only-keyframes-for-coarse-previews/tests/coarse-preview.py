# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,time,sys,hashlib,statistics,random
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
def run(cmd):
 with (p/'commands.log').open('a') as f:f.write(' '.join(map(str,cmd))+'\n')
 r=subprocess.run(list(map(str,cmd)),stdout=subprocess.PIPE,stderr=subprocess.PIPE);assert r.returncode==0,r.stderr.decode();return r.stdout
(p/'plan.json').write_text(json.dumps({'predeclared':True,'scope':'Explicit coarse storyboard only,144frame720p24fpsH264 closed24frameGOP withBframes;6 IDR images scaled320x180. Source-scoped API admits coarse-keyframes only; reject exactnonkey/openGOP/differentsource requests.','oracle':'Independent full-decode-from-start everyframe320x180RGB sequence; candidate keyframeonly images andPTS exact. Baseline full-decode selectI thensamebilinear scaler.','metric':'9alternating coldhostprocess pairs; demux/decode/scale/write/readoutputbytes/cleanup charged. lower95 pairedaggregate saving>=10%; notWasm/browserroute claim.'},indent=2))
source=p/'source.mp4';run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=1280x720:rate=24','-frames:v','144','-c:v','libx264','-preset','ultrafast','-g','24','-bf','3','-x264-params','open-gop=0:scenecut=0','-pix_fmt','yuv420p',source]);probe=json.loads(run(['ffprobe','-v','error','-select_streams','v','-show_packets','-show_frames','-of','json',source]));(p/'probe.json').write_text(json.dumps(probe));frames=[x for x in probe['packets_and_frames'] if x['type']=='frame'];packets=[x for x in probe['packets_and_frames'] if x['type']=='packet'];keyids=[i for i,f in enumerate(frames) if f['key_frame']];assert keyids==list(range(0,144,24));encoded=source.read_bytes()
for packet in packets:
 if 'K' not in packet['flags']:continue
 b=encoded[int(packet['pos']):int(packet['pos'])+int(packet['size'])];i=0;types=[]
 while i<len(b):
  n=int.from_bytes(b[i:i+4],'big');types.append(b[i+4]&31);i+=4+n
 assert i==len(b) and 5 in types,'IDR independence proof'
full=run(['ffmpeg','-v','error','-i',source,'-vf','scale=320:180:flags=bilinear','-fps_mode','passthrough','-pix_fmt','rgb24','-f','rawvideo','-']);assert len(full)==144*172800;(p/'full-reference.rgb').write_bytes(full);reference=b''.join(full[i*172800:(i+1)*172800] for i in keyids)
cmd=lambda candidate:['ffmpeg','-v','error']+(['-skip_frame','nokey'] if candidate else [])+['-i',str(source),'-vf',('' if candidate else 'select=eq(pict_type\\,I),')+'scale=320:180:flags=bilinear','-fps_mode','passthrough','-pix_fmt','rgb24','-f','rawvideo','-']
a=run(cmd(False));b=run(cmd(True));assert a==b==reference;(p/'coarse.rgb').write_bytes(b);lowprobe=json.loads(run(['ffprobe','-v','error','-skip_frame','nokey','-select_streams','v','-show_frames','-of','json',source]));pts=[f['pts_time'] for f in frames if f['key_frame']];assert [f['pts_time'] for f in lowprobe['frames']]==pts
sourceid=hashlib.sha256(encoded).hexdigest()
def admit(job):
 if job['source']!=sourceid or job['intent']!='coarse-keyframes' or not job['closed_idr_index']:raise ValueError('inadmissible preview')
 if any(i not in keyids for i in job['frames']):raise ValueError('nonkey exact request')
 return [{'requested_index':i,'actual_pts':frames[i]['pts_time'],'exact_keyframe':True,'coarse':True} for i in job['frames']]
valid={'source':sourceid,'intent':'coarse-keyframes','closed_idr_index':True,'frames':keyids};returned=admit(valid);rejected=0
for changes in [{'source':'other'},{'intent':'exact-playback'},{'closed_idr_index':False},{'frames':[1]}]:
 try:admit({**valid,**changes})
 except ValueError:rejected+=1
assert rejected==4;pairs=[]
for i in range(9):
 pair={}
 for candidate in ([True,False] if i%2 else [False,True]):
  start=time.perf_counter();pixels=run(cmd(candidate));assert pixels==reference;pair['candidate' if candidate else 'baseline']=(time.perf_counter()-start)*1000
 pairs.append(pair)
b=[x['baseline'] for x in pairs];c=[x['candidate'] for x in pairs];rng=random.Random(72);samples=[]
for _ in range(10000):
 ids=[rng.randrange(9) for _ in range(9)];samples.append(100*(1-sum(c[i] for i in ids)/sum(b[i] for i in ids)))
samples.sort();result={'correctness':True,'independent_full_reference':True,'key_indices':keyids,'key_pts':pts,'all_key_packets_IDR':True,'rejected_controls':rejected,'returned':returned,'hashes':[hashlib.sha256(reference[i*172800:(i+1)*172800]).hexdigest() for i in range(6)],'pairs':pairs,'baseline_mean_ms':statistics.mean(b),'candidate_mean_ms':statistics.mean(c),'saving_percent':100*(1-sum(c)/sum(b)),'bootstrap95':[samples[250],samples[9750]],'performance':samples[250]>=10};(p/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))

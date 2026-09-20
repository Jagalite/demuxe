# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,hashlib,struct,math,sys
p=pathlib.Path(sys.argv[1]);commands=[]
def run(args):commands.append(args);return subprocess.check_output(args)
def hashes(path):return [q['data_hash'] for q in json.loads(run(['ffprobe','-v','error','-select_streams','v','-show_packets','-show_data_hash','sha256','-of','json',str(path)]))['packets']]
source=hashes(p/'source.mkv');vs={n:hashes(p/(n+'.mp4'))==source for n in ['baseline','candidate']};assert all(vs.values())
raw={}
for name in ['candidate.ogg','candidate.mkv','candidate.mp4','baseline.mp4']:
 b=run(['ffmpeg','-v','error','-i',str(p/name),'-map','0:a:0','-c:a','pcm_f32le','-f','f32le','-']);(p/(name+'.f32')).write_bytes(b);v=struct.unpack('<'+'f'*(len(b)//4),b);channels=[v[c::2] for c in [0,1]];hs=[hashlib.sha256(struct.pack('<'+'f'*len(c),*c)).hexdigest() for c in channels];amps=[]
 for c in channels:
  a=[]
  for hz in [440,880]:
   xx=sum(x*math.cos(2*math.pi*hz*i/48000) for i,x in enumerate(c));yy=sum(x*math.sin(2*math.pi*hz*i/48000) for i,x in enumerate(c));a.append(2*math.hypot(xx,yy)/len(c))
  amps.append(a)
 raw[name]={'samples':len(v)//2,'channelHashes':hs,'toneAmplitudes':amps}
browser=json.loads((p/'results.json').read_text());bg=next(x for x in browser['probe']['decoded'] if x['mode']=='candidate-ogg');raw['candidate.ogg']['browserWholePCMExact']=bg['channelHashes']==raw['candidate.ogg']['channelHashes'];assert raw['candidate.ogg']['samples']==48000 and raw['candidate.mkv']['samples']==48000;raw['candidate.ogg']['browserMaxAbsoluteFloatError']=max(abs(x-y) for x,y in zip(struct.unpack('<96000f',(p/'candidate.ogg.f32').read_bytes()),struct.unpack('<96000f',(p/'candidate-ogg-browser.f32').read_bytes())));raw['candidate.ogg']['strict1e5FloatTolerancePassed']=raw['candidate.ogg']['browserMaxAbsoluteFloatError']<1e-5;assert raw['candidate.ogg']['toneAmplitudes'][0][0]>.15 and raw['candidate.ogg']['toneAmplitudes'][1][1]>.15
assert raw['candidate.mp4']['samples']!=48000 and raw['baseline.mp4']['samples']!=48000
result={'videoPackets':len(source),'copiedVideoPacketHashesExact':vs,'outputs':raw,'encoderResetDiscardedOldQueuedBlock':browser['probe']['candidate']['packetCount']==51,'oggAndMatroskaSampleCountPassed':True,'lossyCrossDecoderFloatNote':'Hashes differ and strict1e-5 absolute check fails at9.5144e-5; no exact-float or universal quality qualification inferred','requestedMp4DestinationFidelityPassed':False,'performance':'Not benchmarked: complete destination sample-count gate fails. Incidental single-run timings are diagnostic only.'};(p/'verification.json').write_text(json.dumps(result,indent=2)+'\n');(p/'verification-commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print(json.dumps(result))

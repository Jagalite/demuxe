# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib,time,statistics,random,sys
r=Path(sys.argv[1]);source=Path('results/top100/configuration/small.h264');digest=lambda b:hashlib.sha256(b).hexdigest()
def remux(data):return subprocess.check_output(['ffmpeg','-v','error','-f','h264','-r','24','-i','pipe:0','-map','0:v:0','-c','copy','-movflags','frag_keyframe+empty_moov+default_base_moof','-f','mp4','pipe:1'],input=data)
def decode(data,kind):return subprocess.check_output(['ffmpeg','-v','error','-f',kind,'-i','pipe:0','-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','pipe:1'],input=data)
oracle=decode(source.read_bytes(),'h264');cache={};budget=1024*1024
identity=lambda data,recipe='copy-v1',tracks='v0',origin=0:(digest(data),recipe,tracks,origin)
def get(key):
 e=cache.get(key)
 if e is None:return None
 if digest(e[0])!=e[1]:raise ValueError('corrupt prepared bytes')
 return bytes(bytearray(e[0]))
def put(key,data):
 if len(data)>budget:raise ValueError('budget')
 cache[key]=(data,digest(data))
def job(candidate):
 cache.clear();started=time.perf_counter_ns();retained=0;generated=0;outputs=[]
 for _ in range(5):
  data=source.read_bytes();key=identity(data);prepared=get(key) if candidate else None
  if prepared is None:
   prepared=remux(data);generated+=len(prepared)
   if candidate:put(key,prepared);retained=len(prepared)
  actual=decode(prepared,'mp4');assert actual==oracle;outputs.append(digest(actual))
 elapsed=time.perf_counter_ns()-started;cache.clear();return {'ns':elapsed,'retainedBytes':retained,'generatedBytes':generated,'outputSHA256':outputs}
result={'plan':json.loads((r/'plan.json').read_text()),'pairs':[],'oracleSHA256':digest(oracle),'sourceSHA256':digest(source.read_bytes())}
try:
 data=source.read_bytes();key=identity(data);prepared=remux(data);put(key,prepared);assert get(key)==prepared
 for altered in [identity(data,'copy-v2'),identity(data,tracks='v1'),identity(data,origin=1),identity(data+b'x')]:assert get(altered) is None
 cache[key]=(bytes([prepared[0]^1])+prepared[1:],digest(prepared))
 try:get(key);raise AssertionError('corruption accepted')
 except ValueError:pass
 result['wrongIdentityMisses']=4;result['corruptionRejected']=True
 for i in range(9):
  p={'pair':i}
  for mode in (['candidate','baseline'] if i%2 else ['baseline','candidate']):p[mode]=job(mode=='candidate')
  result['pairs'].append(p)
 values=[1-p['candidate']['ns']/p['baseline']['ns'] for p in result['pairs']];rng=random.Random(3392);bs=sorted(statistics.median(rng.choices(values,k=len(values))) for _ in range(10000));result['analysis']={'medianSaving':statistics.median(values),'bootstrap95':[bs[250],bs[9750]],'accepted':bs[250]>.1,'baselineMs':statistics.median(p['baseline']['ns']/1e6 for p in result['pairs']),'candidateMs':statistics.median(p['candidate']['ns']/1e6 for p in result['pairs'])};result['passed']=True
except Exception as e:result['error']=repr(e);raise
finally:(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result.get('analysis',result)))

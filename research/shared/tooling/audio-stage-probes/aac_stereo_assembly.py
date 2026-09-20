# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,hashlib,subprocess,array,ast,time,statistics
import aac_sce_parser as parser
from aac_sce_parser import *
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);base=pathlib.Path('research/shared/runs/20260919T230128Z-aac-elements');inputs=[base/'mono0.aac',base/'mono4.aac'];claims=[{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'rate':48000,'priming':1024,'origin':0,'inputSamples':48000,'frames':48}for f in inputs]
(p/'protocol.json').write_text(json.dumps({'scope':'Exactly aligned independent AAC-LC mono sources retained as two SCEs in stereo PCE, channel_configuration0. Encoder-authored source identities/rate/origin/priming/input length certificates mandatory; no inference from codec name.','correctness':'All49152 decoded samples each channel equal original independent mono in host and Chrome. Parser rejects unsupported dependencies; priming/origin/hash/length mismatch, cancellation reject.','performance':'Five alternating cold table read/init, both source read/identity/parser/PCE assembly/write+single stereo decode versus two original mono decodes+PCM interleave. Same stereo float PCM endpoint, <=0.9cost. Prepared decode-only claims excluded.','claims':claims,'sourceRun':str(base)},indent=2))
def prefix():
 b=Bits()
 for v,n in [(5,3),(0,4),(1,2),(3,4),(2,4),(0,4),(0,4),(0,2),(0,3),(0,4),(0,1),(0,1),(0,1),(0,1),(0,4),(0,1),(1,4)]:b.put(v,n)
 b.bits+='0'*(-len(b.bits)%8);b.put(0,8);return b.bits
def assemble(data,claims,cancel=False):
 if cancel:raise ValueError('cancel')
 if len(data)!=2 or len(claims)!=2:raise ValueError('input count')
 fields=['rate','priming','origin','inputSamples','frames']
 if any(claims[0][x]!=claims[1][x]for x in fields)or claims[0]['rate']!=48000:raise ValueError('alignment')
 lanes=[]
 for raw,claim in zip(data,claims):
  if hashlib.sha256(raw).hexdigest()!=claim['sha256']:raise ValueError('identity')
  packets=adts_packets(raw)
  if len(packets)!=claim['frames']:raise ValueError('length')
  lanes.append([mono_sce(x)for x in packets])
 result=b''
 for a,b in zip(*lanes):
  out=Bits(prefix());out.bits+='000'+a[:4]+a[4:]+'0000001'+b[4:];out.put(7,3);result+=adts(out.bytes(),0)
 return result
raw=[f.read_bytes()for f in inputs];source=assemble(raw,claims);(p/'stereo.aac').write_bytes(source)
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
refs=[]
for f in inputs:
 a=array.array('f');a.frombytes(decode(f));refs.append(a)
full=array.array('f');full.frombytes(decode(p/'stereo.aac'));assert full[0::2]==refs[0]and full[1::2]==refs[1];controls={}
for field,value in [('priming',0),('origin',1024),('sha256','wrong'),('frames',47)]:
 bad=json.loads(json.dumps(claims));bad[1][field]=value
 try:assemble(raw,bad);controls[field]=False
 except ValueError:controls[field]=True
try:assemble(raw,claims,True);controls['cancel']=False
except ValueError:controls['cancel']=True
assert all(controls.values());(p/'results.json').write_text(json.dumps({'frames':48,'samplesPerChannel':len(refs[0]),'hostPCMExact':True,'controls':controls,'outputBytes':len(source),'sourceBytes':sum(map(len,raw)),'sourceClaims':claims},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/aac_stereo_assembly.py '+str(p)+'\n');print({'hostPCMExact':True,'controls':controls})

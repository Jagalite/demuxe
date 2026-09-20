# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,array,hashlib
from aac_sce_parser import *
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
(p/'protocol.json').write_text(json.dumps({'scope':'Six independently encoded48k mono AAC-LC SCEs, PCE6.0 with three front/two side/one back SCE. Literal5.1 requires an LFE element, so do not mislabel six-SCE6.0 as5.1. Select631Hz tag4 by actual ICS/section/scalefactor/spectral Huffman traversal, no PCM reconstruction. Reject CPE/coupling/prediction/SBR/PNS/TNS/pulse/gain.','correctness':'Every host/native selected sample equals standalone mono4 and corresponding assembled-source channel; all coded SCE bits except renamed tag unchanged,48frames priming/tail retained. Unsupported tools/identity/intent/truncation reject.','performance':'After correctness five alternating cold source read/identity/full six-SCE parsing/rewrite plus mono destination decode versus six-channel source decode plus PCM channel select. Table load cold setup charged each job. <=0.9cost; selectedbytes separate.'},indent=2))
commands=[]
for i,hz in enumerate([211,317,421,523,631,743]):
 cmd=['ffmpeg','-v','error','-y','-f','lavfi','-i',f'sine=frequency={hz}:sample_rate=48000:duration=1','-c:a','aac','-b:a','64k','-aac_tns','0','-aac_pns','0','-f','adts',str(p/f'mono{i}.aac')];subprocess.run(cmd,check=True);commands.append(cmd)
def pce():
 b=Bits()
 for v,n in [(5,3),(0,4),(1,2),(3,4),(3,4),(2,4),(1,4),(0,2),(0,3),(0,4),(0,1),(0,1),(0,1)]:b.put(v,n)
 for tag in range(6):b.put(0,1);b.put(tag,4)
 b.bits+='0'*(-len(b.bits)%8);b.put(0,8);return b.bits
PCE=pce();lanes=[[mono_sce(x)for x in adts_packets((p/f'mono{i}.aac').read_bytes())]for i in range(6)];source=b''
for frame in range(48):
 b=Bits(PCE)
 for tag in range(6):b.put(0,3);b.put(tag,4);b.bits+=lanes[tag][frame][4:]
 b.put(7,3);source+=adts(b.bytes(),0)
(p/'source.aac').write_bytes(source)
def select(data,identity,tag=4,cancelled=False):
 if hashlib.sha256(data).hexdigest()!=identity:raise ValueError('identity')
 if tag not in range(6)or cancelled:raise ValueError('intent/cancel')
 out=b'';proofs=[]
 for payload in adts_packets(data):
  b=Bits.frombytes(payload)
  if b.bits[:len(PCE)]!=PCE:raise ValueError('PCE config')
  b.at=len(PCE);elements={}
  for _ in range(6):
   if b.get(3)!=0:raise ValueError('CPE/coupling/non-SCE')
   key,coded=sce(b)
   if key in elements:raise ValueError('duplicate element')
   elements[key]=coded
  if set(elements)!=set(range(6))or b.get(3)!=7:raise ValueError('element set/SBR')
  selected=elements[tag];output=Bits('0000000'+selected[4:]);output.put(7,3);out+=adts(output.bytes(),1);proofs.append(hashlib.sha256(selected[4:].encode()).hexdigest())
 return out,proofs
identity=hashlib.sha256(source).hexdigest();selected,proofs=select(source,identity);(p/'selected.aac').write_bytes(selected)
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
mono=decode(p/'mono4.aac');actual=decode(p/'selected.aac');full=array.array('f');full.frombytes(decode(p/'source.aac'));matches=[c for c in range(6)if full[c::6].tobytes()==mono];assert actual==mono and len(matches)==1,(len(actual),len(mono),matches);controls={}
for name,data,claim,kw in [('identity',source,'wrong',{}),('intent',source,identity,{'tag':6}),('cancel',source,identity,{'cancelled':True}),('truncated',source[:-1],hashlib.sha256(source[:-1]).hexdigest(),{})]:
 try:select(data,claim,**kw);controls[name]=False
 except ValueError:controls[name]=True
for name,element in [('CPE',1),('coupling',2)]:
 packets=adts_packets(source);b=Bits.frombytes(packets[0]);at=len(PCE);b.bits=b.bits[:at]+format(element,'03b')+b.bits[at+3:];bad=adts(b.bytes(),0)+b''.join(adts(x,0)for x in packets[1:])
 try:select(bad,hashlib.sha256(bad).hexdigest());controls[name]=False
 except ValueError:controls[name]=True
# Direct parser tool guards using authored syntactically positioned minimal headers.
for name,bits in [('prediction','0000'+'00000000'+'0'+'00'+'0'+'000000'+'1'),('SBR','110'+'0001'+'1101'+'0000'+'111')]:
 try:
  if name=='prediction':sce(Bits(bits))
  else:mono_sce(Bits(bits).bytes())
  controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values());(p/'results.json').write_text(json.dumps({'sourceSHA256':identity,'frames':48,'samples':len(mono)//4,'fullSourceChannel':matches[0],'hostExact':True,'sourceBytes':len(source),'selectedBytes':len(selected),'codedSCE_SHA256':proofs,'controls':controls,'layout':'6.0 independent SCE; not5.1'},indent=2));(p/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\npython3 research/shared/tooling/audio-stage-probes/aac_elements_probe.py '+str(p)+'\n');print({'samples':len(mono)//4,'channel':matches,'bytes':[len(source),len(selected)],'controls':controls})

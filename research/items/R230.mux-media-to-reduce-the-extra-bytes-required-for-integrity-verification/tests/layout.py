# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,struct,hashlib,subprocess,sys
out=Path(sys.argv[1]);source=Path('research/shared/runs/20260919T214800Z-progressive-fidelity/source.mp4');data=source.read_bytes();B=16384;H=lambda b:hashlib.sha256(b).digest()
def boxes(b):
 pos=0;rows=[]
 while pos<len(b):
  n=int.from_bytes(b[pos:pos+4],'big');assert n>=8 and pos+n<=len(b);rows.append((b[pos+4:pos+8],pos,n));pos+=n
 return rows
sourceboxes=boxes(data);base=b''.join(data[p:p+n] for tag,p,n in sourceboxes if tag!=b'mfra');candidate=bytearray();groups=0;pads=[]
for tag,p,n in boxes(base):
 if tag==b'moof':
  if groups:
   pad=(-len(candidate))%B
   if 0<pad<8:pad+=B
   if pad:candidate+=struct.pack('>I4s',pad,b'free')+bytes(pad-8)
   pads.append(pad)
  groups+=1
 candidate+=base[p:p+n]
(out/'baseline.mp4').write_bytes(base);(out/'aligned.mp4').write_bytes(candidate);(out/'plan.json').write_text(json.dumps({'workload':'Two source4s A/V fragment groups; preserve startup and align subsequent moof boundaries to16KiB authenticated BEP52 leaf boundary via legal free boxes. Strip mfra from both prepared layouts to avoid stale absolute tfra offsets. No encoded sample transformation.','gate':'All packet timing/payload and decoded A/V hashes exact; padding<=2% source, sum authenticated bytes for cold startup and distant4s seek improves>=5%. Source and layouts have independent newly pinned identities.','scope':'Static mux layout component with file-root leaf verification; no torrent peer or on-device mux owner claim.'},indent=2))
rows=[]
for mode,b in [('baseline',base),('aligned',bytes(candidate))]:
 p=out/(mode+'.mp4');pkt=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(p)]))['packets'];fields=['stream_index','pts','dts','duration','size','flags','data_hash'];tuples=[{k:x.get(k) for k in fields} for x in pkt];frames=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0','-f','framemd5','-']).decode();(out/(mode+'.framemd5')).write_text(frames)
 bs=boxes(b);initEnd=next(p for t,p,n in bs if t==b'moof');frags=[]
 for i,(t,p,n) in enumerate(bs):
  if t==b'moof':assert bs[i+1][0]==b'mdat';frags.append([p,bs[i+1][1]+bs[i+1][2]])
 leaves=[H(b[i:i+B]) for i in range(0,len(b),B)];width=1<<(len(leaves)-1).bit_length();levels=[leaves+[bytes(32)]*(width-len(leaves))]
 while len(levels[-1])>1:
  l=levels[-1];levels.append([H(l[i]+l[i+1]) for i in range(0,len(l),2)])
 root=levels[-1][0];jobs=[]
 for label,frag in [('startup',frags[0]),('distant',frags[-1])]:
  ranges=[[0,initEnd],frag];indices=sorted({i for s,e in ranges for i in range(s//B,(e-1)//B+1)});total=0
  for i in indices:
   block=b[i*B:(i+1)*B];x=H(block);k=i
   for l in levels[:-1]:x=H(l[k^1]+x) if k&1 else H(x+l[k^1]);k//=2
   assert x==root;total+=len(block)
  jobs.append({'name':label,'ranges':ranges,'verifiedLeafIndices':indices,'verifiedBytes':total,'requestedBytes':sum(e-s for s,e in ranges)})
 # Actual changed payload cannot authenticate against fixed root.
 bad=bytearray(b[:B]);bad[100]^=1;x=H(bad);k=0
 for l in levels[:-1]:x=H(x+l[k^1]);k//=2
 assert x!=root
 rows.append({'mode':mode,'bytes':len(b),'sha256':H(b).hex(),'fileRoot':root.hex(),'packets':tuples,'frames':[x for x in frames.splitlines() if not x.startswith('#')],'jobs':jobs,'changedPayloadRejected':True})
assert rows[0]['packets']==rows[1]['packets'];assert rows[0]['frames']==rows[1]['frames'];padding=len(candidate)-len(base);saved=100*(1-sum(j['verifiedBytes'] for j in rows[1]['jobs'])/sum(j['verifiedBytes'] for j in rows[0]['jobs']));result={'rows':rows,'padding':padding,'paddingPct':100*padding/len(base),'pads':pads,'verifiedByteSavingPct':saved,'correctnessPassed':True,'performancePassed':padding/len(base)<=.02 and saved>=5};(out/'result.json').write_text(json.dumps(result,indent=2));print({k:v for k,v in result.items() if k!='rows'})

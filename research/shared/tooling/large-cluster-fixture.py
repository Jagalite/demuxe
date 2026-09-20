# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,hashlib,subprocess,ast
out=pathlib.Path(sys.argv[1]);input=pathlib.Path(sys.argv[2]);b=input.read_bytes();ns={};tree=ast.parse(pathlib.Path('research/shared/tooling/virtual-cues-fixture.py').read_text());tree.body=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef))];exec(compile(tree,'fixture-parser','exec'),ns);elements=ns['elements'];vint=ns['vint']
def box(tag,payload):
 width=1
 while len(payload)>=(1<<(7*width))-1:width+=1
 return tag.to_bytes((tag.bit_length()+7)//8,'big')+((1<<(7*width))|len(payload)).to_bytes(width,'big')+payload

def uint(tag,n):return box(tag,n.to_bytes(max(1,(n.bit_length()+7)//8),'big'))
head=next(x for x in elements(b) if x[0]==0x1a45dfa3);seg=next(x for x in elements(b) if x[0]==0x18538067);top=list(elements(b,seg[2],seg[3]));metadata=b''.join(b[p:end] for tag,p,start,end,w in top if tag in [0x1549a966,0x1654ae6b]);blocks=[];points=[];clusterdata=bytearray(uint(0xe7,0))
for tag,p,start,end,w in top:
 if tag!=0x1f43b675:continue
 children=list(elements(b,start,end));time=next(int.from_bytes(b[s:e],'big') for t,a,s,e,w in children if t==0xe7)
 for t,a,s,e,w in children:
  if t!=0xa3:continue
  track,q,_=vint(b,s);stamp=time+int.from_bytes(b[q:q+2],'big',signed=True);flags=b[q+2];payload=b[q+3:e];assert track==1 and not flags&6 and 0<=stamp<32768
  body=b[s:q]+stamp.to_bytes(2,'big',signed=True)+bytes([flags])+payload;relative=len(clusterdata);clusterdata.extend(box(0xa3,body));blocks.append({'timestamp':stamp*1000,'key':bool(flags&128),'payloadSHA256':hashlib.sha256(payload).hexdigest(),'payloadBytes':len(payload),'relative':relative})
  if flags&128:points.append({'time':stamp,'relative':relative,'frame':len(blocks)-1})
cluster=box(0x1f43b675,bytes(clusterdata));clusterPos=len(metadata);cues=box(0x1c53bb6b,b''.join(box(0xbb,uint(0xb3,p['time'])+box(0xb7,uint(0xf7,1)+uint(0xf1,clusterPos)+uint(0xf0,p['relative']))) for p in points));payload=metadata+cluster+cues;result=b[head[1]:head[3]]+box(0x18538067,payload);path=out/'large-cluster.webm';path.write_bytes(result);seg2=next(x for x in elements(result) if x[0]==0x18538067);cluster2=next(x for x in elements(result,seg2[2],seg2[3]) if x[0]==0x1f43b675);cues2=next(x for x in elements(result,seg2[2],seg2[3]) if x[0]==0x1c53bb6b)
def packets(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(path)]))['packets']
x,y=packets(input),packets(path);assert len(x)==len(y)==900;assert [[p.get(k) for k in ['pts','dts','duration','data_hash','flags']] for p in x]==[[p.get(k) for k in ['pts','dts','duration','data_hash','flags']] for p in y]
info={'bytes':len(result),'sha256':hashlib.sha256(result).hexdigest(),'clusterStart':cluster2[1],'clusterData':cluster2[2],'clusterEnd':cluster2[3],'cuesStart':cues2[1],'cuesEnd':cues2[3],'segmentStart':seg2[2],'points':points,'blocks':blocks,'packetIdentityAndTimingExact':True};(out/'input.json').write_text(json.dumps(info,indent=2)+'\n');print({k:v for k,v in info.items() if k not in ['blocks','points']})

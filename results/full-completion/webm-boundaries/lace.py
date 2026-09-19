# SPDX-License-Identifier: Apache-2.0
from fixtures import vint,elements
from pathlib import Path
import json,subprocess,os
r=Path(__file__).parent;b=(r/'opus-unlaced.webm').read_bytes()
def box(tag,data):
 t=tag.to_bytes((tag.bit_length()+7)//8,'big');n=1
 while len(data)>=(1<<(7*n))-1:n+=1
 return t+((1<<(7*n))|len(data)).to_bytes(n,'big')+data
es=list(elements(b));segment=next(x for x in es if x['tag']==0x18538067);parts=[];pairs=0
for e in es:
 if e['parent']!=0x18538067:continue
 if e['tag'] in [0x114d9b74,0x1c53bb6b]:continue
 if e['tag']!=0x1f43b675:parts.append(b[e['start']:e['end']]);continue
 children=[x for x in es if x['parent']==0x1f43b675 and e['payload']<=x['start']<e['end']];out=[];i=0
 while i<len(children):
  a=children[i]
  if i+1<len(children) and a['tag']==children[i+1]['tag']==0xa3:
   z=children[i+1];track,p=vint(b,a['payload']);track2,q=vint(b,z['payload']);t=int.from_bytes(b[p:p+2],'big',signed=True);t2=int.from_bytes(b[q:q+2],'big',signed=True)
   if pairs<int(os.environ.get('PAIR_LIMIT','100000')) and track==track2 and t2-t==20 and not(b[p+2]&6 or b[q+2]&6):
    first=b[p+3:a['end']];second=b[q+3:z['end']];size=len(first);lace=bytes([255])*(size//255)+bytes([size%255]);payload=b[a['payload']:p+2]+bytes([b[p+2]|2,1])+lace+first+second;out.append(box(0xa3,payload));pairs+=1;i+=2;continue
  if a['tag']!=0xbf:out.append(b[a['start']:a['end']])
  i+=1
 parts.append(box(0x1f43b675,b''.join(out)))
new=b[:segment['start']]+box(0x18538067,b''.join(parts));output=r/('opus-one-lace.webm' if os.environ.get('PAIR_LIMIT')=='1' else 'opus-laced.webm');output.write_bytes(new)
def packets(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(path)]))['packets']
a=packets(r/'opus-unlaced.webm');c=packets(output);assert len(a)==len(c);assert [p['data_hash'] for p in a]==[p['data_hash'] for p in c];assert [p['pts'] for p in a]==[p['pts'] for p in c]
(r/('one-lace-identity.json' if os.environ.get('PAIR_LIMIT')=='1' else 'lace-identity.json')).write_text(json.dumps({'pairs':pairs,'packets':len(a),'payloadAndPtsExact':True},indent=2)+'\n')

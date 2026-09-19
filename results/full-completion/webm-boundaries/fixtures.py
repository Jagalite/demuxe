# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess
r=Path(__file__).parent
masters={0x18538067,0x1654ae6b,0xae,0x1f43b675,0xa0}
def vint(b,p,tag=False):
 n=1
 while n<=8 and not b[p]&(128>>(n-1)):n+=1
 assert n<=8
 v=int.from_bytes(b[p:p+n],'big');return (v if tag else v&((1<<(7*n))-1)),p+n

def elements(b,start=0,end=None,parent=None):
 end=len(b) if end is None else end;p=start
 while p<end:
  tag,q=vint(b,p,True);n,q=vint(b,q);stop=min(q+n,end)
  yield dict(tag=tag,start=p,payload=q,end=stop,parent=parent)
  if tag in masters:yield from elements(b,q,stop,tag)
  p=stop

rows=[]
for name,path in [('vp8',r/'vp8.webm'),('vp9',r.parent/'continuity/maintained-webm.webm')]:
 b=path.read_bytes();e=list(elements(b));duration=[x for x in e if x['tag']==0x23e383];block=next(x for x in e if x['tag']==0xa3);alter=bytearray(b)
 for x in duration:
  length=x['end']-x['start'];assert length<128;alter[x['start']:x['end']]=bytes([0xec,0x80|(length-2)])+bytes(length-2)
 (r/(name+'-default.webm')).write_bytes(b);(r/(name+'-no-default.webm')).write_bytes(alter)
 rows.append(dict(name=name,firstBlockEnd=block['end'],defaultDuration=[int.from_bytes(b[x['payload']:x['end']],'big') for x in duration],blockCount=sum(x['tag'] in [0xa3,0xa1] for x in e),laceFlags=[b[vint(b,x['payload'])[1]+2]&6 for x in e if x['tag'] in [0xa3,0xa1]],clusters=[x['start'] for x in e if x['tag']==0x1f43b675]))
(r/'metadata.json').write_text(json.dumps(rows,indent=2)+'\n')

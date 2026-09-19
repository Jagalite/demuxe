# SPDX-License-Identifier: Apache-2.0
# Fixture-only ordering correction: preserve every block and cluster byte length.
import pathlib,json,hashlib
r=pathlib.Path(__file__).parent;b=bytearray((r/'green-nonnegative.webm').read_bytes())
def vint(p,identifier=False):
 n=1
 while n<=8 and not b[p]&(128>>(n-1)):n+=1
 if n>8:raise ValueError('invalid vint')
 v=int.from_bytes(b[p:p+n],'big');return (v if identifier else v&((1<<(7*n))-1)),p+n
p=0;clusters=[]
while p<len(b):
 tag,q=vint(p,True);n,q=vint(q)
 if tag==0x18538067:p=q;continue
 if tag!=0x1f43b675:p=q+n;continue
 end=q+n;children=[];c=q
 while c<end:
  start=c;t,c=vint(c,True);size,c=vint(c);payload=c;data=bytes(b[start:c+size]);c+=size
  if t==0xe7:children.append((None,data));continue
  if t==0xa3:block=payload
  elif t==0xa0:
   z=payload;block=None
   while z<payload+size:
    child,z=vint(z,True);length,z=vint(z)
    if child==0xa1:block=z
    z+=length
   assert block is not None
  else:raise ValueError('Unexpected cluster element '+hex(t))
  _,off=vint(block);time=int.from_bytes(b[off:off+2],'big',signed=True);children.append((time,data))
 assert children[0][0] is None and all(t is not None for t,d in children[1:])
 sortedblocks=sorted(children[1:],key=lambda td:td[0]);replacement=children[0][1]+b''.join(d for t,d in sortedblocks);assert len(replacement)==n;b[q:end]=replacement
 clusters.append({'offset':p,'blocks':len(sortedblocks),'before':[t for t,d in children[1:]],'after':[t for t,d in sortedblocks]});p=end
(r/'green-ordered.webm').write_bytes(b);(r/'fixture-ordering.json').write_text(json.dumps({'scope':'Stable intertrack ordering only, within original clusters; same-length blocks and unchanged per-track order/timestamps/payload. No decoder or route patch.','clusters':clusters,'sha256':hashlib.sha256(b).hexdigest()},indent=2)+'\n')

# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,hashlib
out=pathlib.Path(sys.argv[1]);b=pathlib.Path(sys.argv[2]).read_bytes()
def vint(b,p,tag=False):
 if p>=len(b) or b[p]==0:raise ValueError('vint')
 n=1
 while not b[p]&(128>>(n-1)):n+=1
 if p+n>len(b):raise ValueError('vint bounds')
 v=int.from_bytes(b[p:p+n],'big');return (v if tag else v&((1<<(7*n))-1)),p+n,n

def elements(b,a=0,end=None):
 end=len(b) if end is None else end
 while a<end:
  t,q,_=vint(b,a,True);n,start,w=vint(b,q);stop=min(start+n,end)
  if stop<=a:raise ValueError('element bound')
  yield t,a,start,stop,w;a=stop
seg=next(x for x in elements(b) if x[0]==0x18538067);cues=next(x for x in elements(b,seg[2],seg[3]) if x[0]==0x1c53bb6b);_,pos,start,end,width=cues;payload=end-start;header=b'\xec'+((1<<(7*(width+3)))|payload).to_bytes(width+3,'big');assert len(header)==start-pos
control=b[:pos]+header+bytes(payload)+b[end:];assert len(control)==len(b)
points=[]
for typ,a,z,e,w in elements(b,start,end):
 if typ!=0xbb:continue
 time=None
 for t,aa,zz,ee,ww in elements(b,z,e):
  if t==0xb3:time=int.from_bytes(b[zz:ee],'big')
  if t==0xb7:
   values={tt:int.from_bytes(b[zzz:eee],'big') for tt,aaa,zzz,eee,www in elements(b,zz,ee)};absolute=seg[2]+values[0xf1];assert vint(b,absolute,True)[0]==0x1f43b675;points.append({'time':time,'cluster':absolute,'relative':values.get(0xf0),'track':values[0xf7]})
sha=lambda x:hashlib.sha256(x).hexdigest();manifest={'sourceSHA256':sha(control),'sourceBytes':len(control),'overlayStart':pos,'overlayEnd':end,'overlaySHA256':sha(b[pos:end]),'virtualSHA256':sha(b),'points':points,'segmentStart':seg[2]};(out/'cueless.webm').write_bytes(control);(out/'cues.bin').write_bytes(b[pos:end]);(out/'indexed-reference.webm').write_bytes(b);(out/'index.json').write_text(json.dumps(manifest,indent=2)+'\n');print({'bytes':len(b),'cueBytes':end-pos,'cuePoints':len(points)})

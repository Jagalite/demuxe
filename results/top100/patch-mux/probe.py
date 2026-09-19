# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib
r=Path(__file__).parent;b=Path('results/top100/mse/red.mp4').read_bytes()
def boxes(data,start=0,end=None):
 end=len(data) if end is None else end
 while start<end:
  n=int.from_bytes(data[start:start+4],'big');t=data[start+4:start+8]
  if n<8 or start+n>end:raise ValueError('box bounds')
  yield t,start,n;start+=n
allboxes=list(boxes(b));moofs=[(p,n) for t,p,n in allboxes if t==b'moof'];first,n=moofs[0];init=b[:first];template=b[first:first+n];fields={}
for t,p,n in boxes(template,8):
 if t==b'mfhd':fields['sequence']=(p+12,4)
 if t==b'traf':
  for tag,q,size in boxes(template,p+8,p+n):
   if tag==b'tfhd':assert template[q+8:q+12]==bytes.fromhex('00020038');fields['duration']=(q+16,4);fields['size']=(q+20,4)
   if tag==b'tfdt':assert template[q+8]==1;fields['dts']=(q+12,8)
   if tag==b'trun':assert int.from_bytes(template[q+12:q+16],'big')==1;fields['offset']=(q+16,4)
def signature(data):
 out=bytearray(data)
 for p,n in fields.values():out[p:p+n]=bytes(n)
 return bytes(out)
fixed=signature(template)
def emit(sequence,duration,dts,payload):
 if not (1<=sequence<2**32 and 0<duration<2**32 and 0<=dts<2**64 and 0<len(payload)<1048576):raise ValueError('parameter bound')
 header=bytearray(template)
 for k,value in {'sequence':sequence,'duration':duration,'dts':dts,'size':len(payload),'offset':len(template)+8}.items():
  p,n=fields[k];header[p:p+n]=value.to_bytes(n,'big')
 return header+be(len(payload)+8)+b'mdat'+payload
def be(n):return n.to_bytes(4,'big')
rebuilt=bytearray(init);retimed=bytearray(init)
for seq,(p,n) in enumerate(moofs,1):
 header=b[p:p+n];assert signature(header)==fixed;mdat=p+n;size=int.from_bytes(b[mdat:mdat+4],'big');assert b[mdat+4:mdat+8]==b'mdat';payload=b[mdat+8:mdat+size];dp,dn=fields['duration'];tp,tn=fields['dts'];duration=int.from_bytes(header[dp:dp+dn],'big');dts=int.from_bytes(header[tp:tp+tn],'big');rebuilt.extend(emit(seq,duration,dts,payload));retimed.extend(emit(seq,duration*2,dts*2,payload))
(r/'rebuilt.mp4').write_bytes(rebuilt);(r/'retimed.mp4').write_bytes(retimed)
def probe(file):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(file)]))['packets']
a=probe('results/top100/mse/red.mp4');x=probe(r/'rebuilt.mp4');y=probe(r/'retimed.mp4');assert len(a)==len(x)==len(y)==24
for source,copy,slow in zip(a,x,y):
 for k in ['pts','dts','duration','data_hash']:assert source[k]==copy[k]
 assert source['data_hash']==slow['data_hash']
 for k in ['pts','dts','duration']:assert slow[k]==source[k]*2
raw=lambda file:subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'])
assert raw('results/top100/mse/red.mp4')==raw(r/'rebuilt.mp4')==raw(r/'retimed.mp4')
bad=bytearray(template);bad[12]^=1;assert signature(bad)!=fixed
try:emit(1,0,0,b'x');raise AssertionError('zero duration')
except ValueError:pass
(r/'result.json').write_text(json.dumps({'scope':'One qualified AVC video-only, one sample per fragment recipe. Compiled fixed moof skeleton patches sequence/default duration/default size/tfdt/data offset; arbitrary configurations reject.','fields':fields,'templateSHA256':hashlib.sha256(template).hexdigest(),'rebuiltPacketPayloadTimingExact':True,'retimedPayloadExact':True,'retimedTimesScale':2,'framesUnchanged':24,'decodedPixelsExact':True,'mutatedSkeletonRejected':True,'invalidDurationRejected':True,'passed':True},indent=2)+'\n')

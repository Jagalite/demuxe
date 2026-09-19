# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib
r=Path('research/items/R296.generate-seek-fragments-without-replaying-a-mux-session/evidence/20260919T200000Z-stateless-seek');b=Path('results/top100/mse/red.mp4').read_bytes()
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

identity=hashlib.sha256(b).hexdigest()
packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json','results/top100/mse/red.mp4']))['packets']
def construct(index,version,sequence=1):
 if version!=identity:raise ValueError('source identity')
 if index<0 or index>=len(moofs):raise ValueError('sample interval')
 if 'K' not in packets[index]['flags']:raise ValueError('not random access')
 p,n=moofs[index];header=b[p:p+n]
 if signature(header)!=fixed:raise ValueError('configuration skeleton')
 size=int.from_bytes(b[p+n:p+n+4],'big');payload=b[p+n+8:p+n+size]
 dp,dn=fields['duration'];tp,tn=fields['dts']
 return bytes(init+emit(sequence,int.from_bytes(header[dp:dp+dn],'big'),int.from_bytes(header[tp:tp+tn],'big'),payload))
outputs=[]
for position,index in enumerate([20,3,21,3]):
 data=construct(index,identity);path=r/f'seek-{position}.mp4';path.write_bytes(data)
 actual=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(path)]))['packets'];assert len(actual)==1
 for key in ['pts','dts','duration','data_hash']:assert actual[0][key]==packets[index][key]
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-pix_fmt','yuv420p','-f','rawvideo','-']);assert len(raw)==160*96*3//2
 outputs.append({'index':index,'sha256':hashlib.sha256(data).hexdigest(),'pixelsSHA256':hashlib.sha256(raw).hexdigest()})
assert outputs[1]['sha256']==outputs[3]['sha256']
rejected=[]
for label,args in [('stale-source',(3,'wrong')),('outside-index',(100,identity))]:
 try:construct(*args);raise AssertionError(label)
 except ValueError:rejected.append(label)
old=packets[3]['flags'];packets[3]['flags']='__'
try:construct(3,identity);raise AssertionError('non-RAP')
except ValueError:rejected.append('declared-non-RAP')
packets[3]['flags']=old
(r/'results.json').write_text(json.dumps({'passed':True,'candidateExecuted':True,'fallback':False,'outputs':outputs,'rejected':rejected,'scope':'Immutable qualified AVC one-sample fragment recipe, out-of-order construction; supplied sync metadata, all-intra fixture. No real distant-seek trace, cold indexing comparison, dependent-GOP or player cancellation qualification.'},indent=2)+'\n')

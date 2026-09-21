# SPDX-License-Identifier: MIT
from common import *
import struct

def boxes(b,start=0,end=None):
 end=len(b) if end is None else end;p=start
 while p<end:
  if p+8>end:raise ValueError('box header')
  n=int.from_bytes(b[p:p+4],'big');k=b[p+4:p+8];h=8
  if n==1:
   if p+16>end:raise ValueError('extended box')
   n=int.from_bytes(b[p+8:p+16],'big');h=16
  if n==0:n=end-p
  if n<h or p+n>end:raise ValueError('box extent')
  yield k,p,p+h,p+n;p+=n

def nals(p):
 out=[];at=0
 while at<len(p):
  if at+4>len(p):raise ValueError('NAL length')
  n=int.from_bytes(p[at:at+4],'big');at+=4
  if not n or at+n>len(p) or p[at]&0x80:raise ValueError('NAL bounds/header')
  out.append(p[at:at+n]);at+=n
 return out

def info(f):
 moof=next(x for x in boxes(f) if x[0]==b'moof');mdat=next(x for x in boxes(f) if x[0]==b'mdat')
 traf=next(x for x in boxes(f,moof[2],moof[3]) if x[0]==b'traf');items=list(boxes(f,traf[2],traf[3]));tf=next(x for x in items if x[0]==b'tfhd');tr=next(x for x in items if x[0]==b'trun');at=tf[2];flags=int.from_bytes(f[at+1:at+4],'big');pos=at+8
 if not flags&0x020000 or flags&1:raise ValueError('relative-address fixture required')
 if flags&2:pos+=4
 defaults={}
 for bit,field in [(8,'duration'),(16,'size'),(32,'flags')]:
  if flags&bit:defaults[field]=int.from_bytes(f[pos:pos+4],'big');defaults[field+'_pos']=pos;pos+=4
 p=tr[2];version=f[p];bits=int.from_bytes(f[p+1:p+4],'big');count=int.from_bytes(f[p+4:p+8],'big');p+=8
 if not bits&1 or not bits&4:raise ValueError('explicit first_sample_flags fixture required')
 dataoff=int.from_bytes(f[p:p+4],'big',signed=True);p+=4;firstpos=p;first=int.from_bytes(f[p:p+4],'big');p+=4;data=moof[1]+dataoff;rs=[]
 for i in range(count):
  r={k:defaults[k] for k in ['duration','size','flags'] if k in defaults};r['flags']=first if i==0 else r.get('flags');r['flags_pos']=firstpos if i==0 else defaults.get('flags_pos')
  for bit,field in [(256,'duration'),(512,'size'),(1024,'flags'),(2048,'cto')]:
   if bits&bit:r[field]=int.from_bytes(f[p:p+4],'big',signed=field=='cto' and version==1);r[field+'_pos']=p;p+=4
  if data+r['size']>mdat[3] or data<mdat[2]:raise ValueError('sample outside mdat')
  r['offset']=data;r['payload']=f[data:data+r['size']];r['nal_types']=[x[0]&31 for x in nals(r['payload'])];rs.append(r);data+=r['size']
 if p!=tr[3]:raise ValueError('trun size')
 return rs

def require_idr(payload):
 vcl=[x[0]&31 for x in nals(payload) if (x[0]&31) in (1,2,3,4,5)]
 if not vcl or any(k!=5 for k in vcl):raise ValueError('no all-IDR first access unit')
 return True

def repair(f,expected_payloads):
 rs=info(f)
 if [sha(r['payload']) for r in rs]!=expected_payloads:raise ValueError('source payload identity')
 r=rs[0];require_idr(r['payload'])
 # Restricted existing field: no reframing, no changes to timing/dependency payloads.
 v=(r['flags']&~(0x03000000|0x00010000))|0x02000000
 out=bytearray(f);out[r['flags_pos']:r['flags_pos']+4]=v.to_bytes(4,'big');return bytes(out)

def main():
 run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=160x96:rate=20:duration=4','-an','-c:v','libx264','-preset','medium','-threads','1','-g','20','-keyint_min','20','-sc_threshold','0','-bf','2','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+empty_moov+frag_keyframe+default_base_moof+negative_cts_offsets','-video_track_timescale','20000',F/'original.mp4'])
 b=(F/'original.mp4').read_bytes();tops=list(boxes(b));starts=[p for k,p,a,z in tops if k==b'moof'];init=b[:starts[0]];fs=[]
 for i,a in enumerate(starts):
  end=starts[i+1] if i+1<len(starts) else next((p for k,p,x,z in tops if k==b'mfra' and p>a),len(b));fs.append(b[a:end])
 (F/'encoder_original.mp4').write_bytes(b); (F/'original.mp4').write_bytes(init+b''.join(fs)); (F/'video.init').write_bytes(init);records=[];wrong=[];fixed=[]
 for j,f in enumerate(fs):
  r=info(f);v=bytearray(f);p=r[0]['flags_pos'];v[p:p+4]=(0x01010000).to_bytes(4,'big');w=bytes(v);x=repair(w,[sha(y['payload']) for y in r]);assert x==f
  for name,data in [('original',f),('damaged',w),('repaired',x)]: (F/f'{name}_{j}.m4s').write_bytes(data)
  wrong.append(w);fixed.append(x);records.append({'index':j,'samples':len(r),'first_types':r[0]['nal_types'],'first_flags':r[0]['flags'],'flag_offset':p,'fragment_bytes':len(f),'changed_byte_values':sum(a!=b for a,b in zip(f,w)),'payloads':[sha(y['payload']) for y in r]})
 (F/'damaged.mp4').write_bytes(init+b''.join(wrong));(F/'repaired.mp4').write_bytes(init+b''.join(fixed))
 raw={}
 for name in ['original','damaged','repaired']:
  q=run(['ffmpeg','-nostdin','-v','error','-i',F/(name+'.mp4'),'-map','0:v:0','-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo','-'],check=False);raw[name]={'bytes':len(q.stdout),'sha256':sha(q.stdout),'code':q.returncode}
 # Changed coded-byte identity rejected and genuine dependent first sample not promoted.
 guards={}
 try:repair(wrong[0],['0'*64]*20);guards['wrong_source']=False
 except ValueError as e:guards['wrong_source']=str(e)
 # Negative descriptor: replace the first access unit with an equal-sized dependent NAL is not necessary;
 # exercise its classifier directly against every genuine non-IDR sample in all four fragments.
 dependent=[x for f in fs for x in info(f)[1:] if any(t==1 for t in x['nal_types'])];guards['genuine_dependent_samples_not_IDR']=[]
 for x in dependent:
  try:require_idr(x['payload']);guards['genuine_dependent_samples_not_IDR'].append(False)
  except ValueError:guards['genuine_dependent_samples_not_IDR'].append(True)
 bad=bytearray(wrong[0]);r=info(wrong[0])[0];bad[r['offset']:r['offset']+4]=(r['size']+100).to_bytes(4,'big')
 try:info(bytes(bad));guards['bad_nal_extent']=False
 except ValueError as e:guards['bad_nal_extent']=str(e)
 save('video_manifest.json',{'records':records,'host':raw,'guards':guards,'init':'video.init','variants':{name:{'file':name+'.mp4','fragments':[f'{name}_{i}.m4s' for i in range(len(fs))]} for name in ['original','damaged','repaired']},'times':[.125,.925,1.125,1.925,2.125,2.925,3.125,3.825,1.425,.225],'codec':'avc1.64000A','limitations':'Self-authored H264 single-track closed-GOP fixture. First-sample-only flag repair under source-bound payload hashes and existing parameter configuration. Not arbitrary access-unit/completeness proof.'})
 print('VIDEO',records[0],raw,guards)
if __name__=='__main__':main()

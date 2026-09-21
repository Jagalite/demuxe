# SPDX-License-Identifier: MIT
from common import *
from PIL import Image
import io,numpy as np

def ch(t,b):return t+len(b).to_bytes(4,'little')+b+(b'\0' if len(b)&1 else b'')
def riff(chunks):return b'RIFF'+(len(chunks)+4).to_bytes(4,'little')+b'WEBP'+chunks
def uint24(v):return int(v).to_bytes(3,'little')
def chunks(b,start,end):
 p=start;o=[]
 while p<end:
  if p+8>end:raise ValueError('chunk header')
  n=int.from_bytes(b[p+4:p+8],'little');e=p+8+n
  if e+(n&1)>end:raise ValueError('chunk bounds')
  if n&1 and b[e]!=0:raise ValueError('padding')
  o.append((b[p:p+4],p,p+8,e,e+(n&1)));p=e+(n&1)
 return o

def parse(b,ident):
 if len(b)>64*1024*1024:raise ValueError('file cap')
 if sha(b)!=ident:raise ValueError('source identity')
 if b[:4]!=b'RIFF' or b[8:12]!=b'WEBP' or int.from_bytes(b[4:8],'little')+8!=len(b):raise ValueError('RIFF size')
 cc=chunks(b,12,len(b));types=[q[0] for q in cc]
 if types[:2]!=[b'VP8X',b'ANIM'] or any(t not in [b'VP8X',b'ANIM',b'ANMF'] for t in types):raise ValueError('unsupported metadata/structure')
 x=b[cc[0][2]:cc[0][3]]
 if len(x)!=10 or x[0]!=0x12 or x[1:4]!=bytes(3):raise ValueError('features')
 w=int.from_bytes(x[4:7],'little')+1;h=int.from_bytes(x[7:10],'little')+1
 if w*h>1000000:raise ValueError('pixel cap')
 a=b[cc[1][2]:cc[1][3]]
 if len(a)!=6 or a[:4]!=bytes(4):raise ValueError('background profile')
 fs=[];time=0
 for q in cc[2:]:
  if q[0]!=b'ANMF':raise ValueError('order')
  p=q[2];d=b[p:q[3]]
  if len(d)<24:raise ValueError('ANMF short')
  fx=2*int.from_bytes(d[0:3],'little');fy=2*int.from_bytes(d[3:6],'little');fw=int.from_bytes(d[6:9],'little')+1;fh=int.from_bytes(d[9:12],'little')+1;duration=int.from_bytes(d[12:15],'little');flags=d[15]
  if fx+fw>w or fy+fh>h or flags&~3 or duration<11:raise ValueError('frame bounds/flags/duration')
  sub=chunks(b,p+16,q[3]);
  if len(sub)!=1 or sub[0][0]!=b'VP8L':raise ValueError('lossless-only profile')
  v=b[sub[0][2]:sub[0][3]]
  if len(v)<5 or v[0]!=0x2f:raise ValueError('lossless header')
  bits=int.from_bytes(v[1:5],'little');vw=(bits&0x3fff)+1;vh=((bits>>14)&0x3fff)+1
  if (vw,vh)!=(fw,fh) or bits>>29:raise ValueError('coded geometry')
  if len(fs)>=128:raise ValueError('frame cap')
  fs.append({'x':fx,'y':fy,'w':fw,'h':fh,'duration_ms':duration,'start_ms':time,'blend':not bool(flags&2),'dispose':bool(flags&1),'chunk_start':p+16,'chunk_end':q[3],'compressed_sha':sha(b[p+16:q[3]])});time+=duration
 if not fs:raise ValueError('empty')
 return {'width':w,'height':h,'duration_ms':time,'frames':fs}

def start_for(m,target):
 if not isinstance(target,int) or not 0<=target<len(m['frames']):raise ValueError('target')
 start=0
 for i,f in enumerate(m['frames'][:target+1]):
  full=f['x']==f['y']==0 and (f['w'],f['h'])==(m['width'],m['height'])
  if full and not f['blend']:start=i
  if i<target and full and f['dispose']:start=i+1
 return start

def main():
 w,h=64,48
 geom=[(0,0,64,48,0,0),(4,6,16,16,1,0),(20,4,20,10,0,1),(28,12,10,18,0,0),(0,0,64,48,0,0),(6,6,24,20,0,1),(32,4,12,12,1,0),(10,22,8,8,0,0),(0,0,64,48,0,1),(2,4,18,16,1,0),(30,24,16,12,1,0),(20,18,14,8,0,0)]
 records={}
 for mode in ['binary','fractional']:
  payload=ch(b'VP8X',bytes([0x12,0,0,0])+uint24(w-1)+uint24(h-1))+ch(b'ANIM',bytes(6))
  authored=[]
  for i,(x,y,fw,fh,blend,disp) in enumerate(geom):
   yy,xx=np.mgrid[:fh,:fw];rgba=np.stack([(xx*17+i*19)%256,(yy*23+i*47)%256,((xx+yy)*13+i*67)%256,np.full((fh,fw),255)],2).astype('uint8')
   if i in [1,3,5,6,9,11]:
    rgba[:,:,3]=np.where((xx+2*yy+i)%3==0,0, (128 if mode=='fractional' else 255))
    rgba[rgba[:,:,3]==0,:3]=0
   authored.append(rgba.copy())
   buf=io.BytesIO();Image.fromarray(rgba).save(buf,format='WEBP',lossless=True,quality=100,method=6,exact=True);v=buf.getvalue();subs=chunks(v,12,len(v));vp=next(q for q in subs if q[0]==b'VP8L');data=v[vp[1]:vp[4]]
   frame=uint24(x//2)+uint24(y//2)+uint24(fw-1)+uint24(fh-1)+uint24(100+i*17)+bytes([(0 if blend else 2)|(1 if disp else 0)])+data;payload+=ch(b'ANMF',frame)
  source=riff(payload);name=mode+'.webp';(F/name).write_bytes(source);m=parse(source,sha(source));im=Image.open(io.BytesIO(source));assert im.n_frames==12
  state=np.zeros((h,w,4),dtype='uint8')
  for i,f in enumerate(m['frames']):
   fn=f'{mode}_frame{i}.webp';part=source[f['chunk_start']:f['chunk_end']];(F/fn).write_bytes(riff(part));im.seek(i);ref=im.convert('RGBA')
   if mode=='binary':
    if i and geom[i-1][5]:
     px,py,pw,ph=geom[i-1][:4];state[py:py+ph,px:px+pw]=0
    x,y,fw,fh,blend,disp=geom[i];r=state[y:y+fh,x:x+fw]
    if blend:
     mask=authored[i][:,:,3]==255;r[mask]=authored[i][mask]
    else:r[:]=authored[i]
    f['authored_numpy_oracle_exact']=ref.tobytes()==state.tobytes()
   rn=f'{mode}_ref{i}.png';ref.save(F/rn);frame_ref=f'{mode}_frame{i}.png';Image.open(F/fn).convert('RGBA').save(F/frame_ref);f.update(frame_reference=frame_ref,file=fn,reference=rn,reference_rgba_sha=sha(ref.tobytes()),start_frame=start_for(m,i))
  m.update(file=name,sha=sha(source),bytes=len(source));records[mode]=m
 b=(F/'binary.webp').read_bytes();m=records['binary'];neg={}
 def trial(n,fn):
  try:fn();neg[n]={'rejected':False}
  except (ValueError,OverflowError) as e:neg[n]={'rejected':True,'error':str(e)}
 trial('source_identity',lambda:parse(b,'0'*64));trial('truncated',lambda:parse(b[:-1],sha(b[:-1])))
 q=next(c for c in chunks(b,12,len(b)) if c[0]==b'ANMF');a=bytearray(b);a[q[2]:q[2]+3]=uint24(64);trial('outside_canvas',lambda:parse(bytes(a),sha(a)))
 a=bytearray(b);a[q[2]+15]|=128;trial('reserved_flags',lambda:parse(bytes(a),sha(a)))
 a=bytearray(b);a[q[2]+6:q[2]+9]=uint24(61);trial('wrong_coded_geometry',lambda:parse(bytes(a),sha(a)))
 a=b+ch(b'ICCP',b'not-a-profile');a=a[:4]+(len(a)-8).to_bytes(4,'little')+a[8:];trial('unsupported_profile',lambda:parse(a,sha(a)))
 trial('invalid_target',lambda:start_for(m,12));records['controls']=neg
 save('webp_manifest.json',records);print({k:{'bytes':v['bytes'],'frames':len(v['frames']),'planned_decodes':sum(i-f['start_frame']+1 for i,f in enumerate(v['frames']))} for k,v in records.items() if k!='controls'})
if __name__=='__main__':main()

# SPDX-License-Identifier: MIT
from common import *
import numpy as np

def config(b):
 sd=find(b,'moov/trak/mdia/minf/stbl/stsd');entries=boxes(b,sd[3]+8,sd[2]);assert len(entries)==1
 en=entries[0];ch=boxes(b,en[3]+78,en[2]);av=next(q for q in ch if q[0]=='avcC');md=find(b,'moov/trak/mdia/mdhd');mo=md[3]
 # Full visual sample entry is a deliberately strict compatibility contract.
 return b[en[1]:en[2]],int.from_bytes(b[mo+12:mo+16],'big'),b[av[3]:av[2]]
def patch_ids(b,tid):
 a=bytearray(b);p=find(b,'moov/trak/tkhd')[3];a[p+12:p+16]=tid.to_bytes(4,'big');p=find(b,'moov/mvex/trex')[3];a[p+4:p+8]=tid.to_bytes(4,'big')
 for q in boxes(b):
  if q[0]=='moof':
   f=b[q[1]:q[2]];p=q[1]+find(f,'moof/traf/tfhd')[3]+4;a[p:p+4]=tid.to_bytes(4,'big')
 # Keep the finite source file's random-access footer coherent as well.
 for q in boxes(b):
  if q[0]=='mfra':
   for t in boxes(b,q[3],q[2]):
    if t[0]=='tfra':a[t[3]+4:t[3]+8]=tid.to_bytes(4,'big')
 mv=find(b,'moov/mvhd');a[mv[2]-4:mv[2]]=(tid+1).to_bytes(4,'big')
 return bytes(a)
def remap(fragment,source_init,dest_init,identity):
 if sha(fragment)!=identity:raise ValueError('source fragment identity')
 c,ts,av=config(source_init);d,dt,dv=config(dest_init)
 if c!=d or ts!=dt:raise ValueError('different visual sample entry or timescale')
 q=find(fragment,'moof/traf/tfhd');p=q[3];flags=int.from_bytes(fragment[p:p+4],'big')&0xffffff
 if flags&1 or not flags&0x20000:raise ValueError('unqualified addressing')
 srcid=int.from_bytes(source_init[find(source_init,'moov/trak/tkhd')[3]+12:find(source_init,'moov/trak/tkhd')[3]+16],'big')
 if int.from_bytes(fragment[p+4:p+8],'big')!=srcid:raise ValueError('fragment source track mismatch')
 # trex defaults must agree except track identity; otherwise the same samples need different defaults.
 sp=find(source_init,'moov/mvex/trex')[3];dp=find(dest_init,'moov/mvex/trex')[3]
 if source_init[sp+8:sp+24]!=dest_init[dp+8:dp+24]:raise ValueError('different defaults')
 target=dest_init[dp+4:dp+8];out=bytearray(fragment);out[p+4:p+8]=target;return bytes(out)
def main():
 w,h=160,96;yy,xx=np.mgrid[:h,:w]
 for j,name in enumerate(['v_a','v_b','v_bad']):
  ww=w if j<2 else 176;y,x=np.mgrid[:h,:ww];out=[]
  for k in range(20):out.append(np.stack([(x*3+k*7+j*43)%256,(y*5+k*9+j*79)%256,((x//8+y//8+k+j*3)%2)*200+20],2).astype('uint8').tobytes())
  (F/f'{name}.rgb').write_bytes(b''.join(out));ff('-f','rawvideo','-pix_fmt','rgb24','-s',f'{ww}x{h}','-r','20','-i',F/f'{name}.rgb','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-bf','0','-g','20','-keyint_min','20','-sc_threshold','0','-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-movflags','+empty_moov+frag_keyframe+default_base_moof','-an',F/f'{name}.mp4')
  if j==1:(F/f'{name}.mp4').write_bytes(patch_ids((F/f'{name}.mp4').read_bytes(),17))
  split(name)
 ma={n:split(n) for n in ['v_a','v_b','v_bad']};a=(F/'v_a.init').read_bytes();bb=(F/'v_b.init').read_bytes();f=(F/ma['v_b']['fragments'][0]['file']).read_bytes();out=remap(f,bb,a,sha(f));(F/'v_b_mapped.m4s').write_bytes(out)
 (F/'v_b_mapped.mp4').write_bytes(a+out)
 rec={'sources':ma,'compatibility_equal':config(a)[:2]==config(bb)[:2],'source_b_id':17,'target_id':1,'patched_values':sum(x!=y for x,y in zip(f,out)), 'fragment_bytes':len(f),'mdat_equal':f[find(f,'mdat')[3]:find(f,'mdat')[2]]==out[find(out,'mdat')[3]:find(out,'mdat')[2]],'packet_identity': [q['data_hash'] for q in packet_summary('v_b.mp4')]==[q['data_hash'] for q in packet_summary('v_b_mapped.mp4')], 'controls':{}}
 for k,ffrag,si,di,identity in [('wrong_identity',f,bb,a,'0'*64),('wrong_source_id',out,bb,a,sha(out)),('incompatible',(F/ma['v_bad']['fragments'][0]['file']).read_bytes(),(F/'v_bad.init').read_bytes(),a,sha((F/ma['v_bad']['fragments'][0]['file']).read_bytes()))]:
  try:remap(ffrag,si,di,identity);rec['controls'][k]={'rejected':False}
  except ValueError as e:rec['controls'][k]={'rejected':True,'error':str(e)}
 rec['codec']='avc1.'+config(a)[2][1:4].hex();save('video_manifest.json',rec);print(json.dumps(rec,indent=2))
if __name__=='__main__':main()

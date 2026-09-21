# SPDX-License-Identifier: MIT
from common import *
from pgs import *
import numpy as np,re,subprocess
from PIL import Image

def seg(t,k,b):return b'PG'+be(t,4)+be(0,4)+bytes([k])+be(len(b),2)+b
def pcs(t,n,refs,state=0,pal=0):
 return seg(t,0x16,be(128,2)+be(64,2)+b'\x10'+be(n,2)+bytes([state,pal,0,len(refs)])+b''.join(be(oid,2)+b'\x00\x00'+be(x,2)+be(y,2) for oid,x,y in refs))
def wds(t):return seg(t,0x17,b'\x01\x00'+be(0,2)+be(0,2)+be(128,2)+be(64,2))
pals=[[(0,16,128,128,0),(1,235,128,128,255),(2,235,128,128,128),(3,16,128,128,255)],[(0,16,128,128,0),(1,16,128,128,255),(2,235,128,128,255),(3,235,128,128,128)]]
def pds(t,v):return seg(t,0x14,bytes([0,v])+b''.join(bytes(e) for e in pals[v]))
def rle_encode(a):
 out=b''
 for row in a:
  i=0
  while i<len(row):
   j=i+1
   while j<len(row) and row[j]==row[i]:j+=1
   n=j-i;c=int(row[i]);out+=bytes([0,128|n,c]) if c else bytes([0,n]);i=j
  out+=b'\0\0'
 return out
def ods(t,oid,a,fragmented=False):
 r=rle_encode(a);w=a.shape[1];h=a.shape[0]
 if not fragmented:return seg(t,0x15,be(oid,2)+b'\x00\xc0'+be(len(r)+4,3)+be(w,2)+be(h,2)+r)
 cut=len(r)//2+1
 return seg(t,0x15,be(oid,2)+b'\x00\x80'+be(len(r)+4,3)+be(w,2)+be(h,2)+r[:cut])+seg(t,0x15,be(oid,2)+b'\x00\x40'+r[cut:])
a=np.tile(np.repeat(np.arange(4,dtype='u1'),10),(16,1));b=np.fromfunction(lambda y,x:((x//4+y//3)%4),(12,24),dtype=int).astype('u1');c=np.fliplr(a).copy()
times=[22500,67500,112500,157500,202500,247500]
source=b'';definitions=[[(0,4,8),(1,65,30)],[(0,4,8),(1,65,30)],[(0,35,40)],[],[(0,4,8)],[]]
for i,t in enumerate(times):
 source+=pcs(t,i,definitions[i],128 if i in [0,4] else 0,128 if i==1 else 0)
 if i in [0,4]:source+=wds(t)+pds(t,0)+ods(t,0,a if i==0 else c,True)
 if i==0:source+=ods(t,1,b,True)
 if i==1:source+=pds(t,1)
 source+=seg(t,0x80,b'')
(F/'stateful.sup').write_bytes(source);P=Parser(sha(source));events=P.parse(source)
# Independent host decoder output, no burn-in/color conversion through a YUV video.
cmd=['ffmpeg','-hide_banner','-y','-copyts','-i',str(F/'stateful.sup'),'-filter_complex','[0:s]format=rgba,showinfo[v]','-map','[v]','-fps_mode','passthrough','-f','rawvideo',str(E/'pgs_host.rgba')]
r=subprocess.run(cmd,capture_output=True,timeout=20);(E/'pgs_host.log').write_bytes(r.stderr);assert r.returncode==0
frames=np.fromfile(E/'pgs_host.rgba','u1').reshape(-1,64,128,4);rows=re.findall(r'n:\s*(\d+) pts:\s*(-?\d+) pts_time:',r.stderr.decode());hostmap={int(t):int(i) for i,t in rows}
manifest=[];nativepng={};wrong_oldpalette={}
for j,e in enumerate(events):
 ref=frames[hostmap[round(e['pts']/90000*1e6)]];expected=np.zeros((64,128,4),dtype='u1')
 ds=[]
 for k,d in enumerate(e['draws']):
  arr=np.frombuffer(d['index'],'u1').reshape(d['height'],d['width']);pal=np.array([d['palette'][k] for k in range(4)],'u1');expected[d['y']:d['y']+d['height'],d['x']:d['x']+d['width']]=pal[arr]
  name='pgs_'+sha(d['image'])[:16]+'.png';(F/name).write_bytes(d['image']);nativepng[name]=len(d['image'])
  ds.append({k:v for k,v in d.items() if k not in ['image','index','palette']}|{'file':name})
 n=f'pgs_reference_{j}.png';Image.fromarray(ref).save(F/n)
 if not np.array_equal(ref,expected):raise AssertionError(f'host bitmap mismatch event{j} {np.max(np.abs(ref.astype(int)-expected.astype(int)))}')
 manifest.append({'pts':e['pts'],'epoch':e['epoch'],'reference':n,'draws':ds,'straight_rgba_exact':True})
# Real malformed input gates, not only an abstract flag.
ss=list(segments(source));controls={}
mutations={
 'cold_palette_event':b''.join(source[o:(ss[z+1][3] if z+1<len(ss) else len(source))] for z,(t,k,p,o) in enumerate(ss) if t==times[1]),
 'missing_ods_continuation':b''.join(seg(t,k,p) for t,k,p,o in ss if not(k==0x15 and p[3]==64 and t==times[0])),
 'truncated_file':source[:-1],
 'wrong_palette_chroma':source.replace(bytes([1,235,128,128,255]),bytes([1,235,130,128,255]),1),
 'missing_epoch_object':b''.join(seg(t,k,p) for t,k,p,o in ss if not(k==0x15 and t==times[4]))}
for name,src in mutations.items():
 (F/(name+'.sup')).write_bytes(src)
 try:Parser(sha(src)).parse(src);controls[name]={'rejected':False}
 except ValueError as ex:controls[name]={'rejected':True,'reason':str(ex)}
try:Parser(sha(source)).parse(source+b'x');controls['changed_source_bytes']={'rejected':False}
except ValueError as ex:controls['changed_source_bytes']={'rejected':True,'reason':str(ex)}
try:P.feed(0,0x80,b'','wrong_source');controls['wrong_source']={'rejected':False}
except ValueError as ex:controls['wrong_source']={'rejected':True,'reason':str(ex)}
# Direct RLE overlong-row negative and out-of-bounds object guard.
try:rle_decode(bytes([0,0xbf,1,0,0]),40,1);controls['oversized_row']={'rejected':False}
except ValueError as ex:controls['oversized_row']={'rejected':True,'reason':str(ex)}
# Cold seek to the second epoch succeeds without any earlier data.
cold=b''.join(seg(t,k,p) for t,k,p,o in ss if t>=times[4]);CP=Parser(sha(cold));ce=CP.parse(cold);assert ce[0]['draws'][0]['image']==events[4]['draws'][0]['image']
save('pgs_manifest.json',{'source_hash':sha(source),'source_bytes':len(source),'canvas':[128,64],'events':manifest,'decoded_objects':P.rle_decodes,'idat_hashes':[d['idat_hash'] for e in manifest for d in e['draws']],'png_assets':nativepng,'controls':controls,'cold_epoch_seek_exact':True,'boundaries':'neutral black/white palettes, alpha 0/128/255, <=2 nonoverlapping objects; snapshot commits at END; no general PGS claim','oracle':'independent FFmpeg pgssub -> RGBA subtitle-only video; no YUV background overlay'})
print('PGS',len(source),'bytes;',P.rle_decodes,'object decodes;',len(nativepng),'PNG assets;',len(events),'displays',controls)

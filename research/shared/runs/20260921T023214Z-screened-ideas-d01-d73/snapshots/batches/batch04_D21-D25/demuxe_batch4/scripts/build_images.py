from common import *
from rle_png import transcode
from apng_view import parse,plan
from PIL import Image
import numpy as np,io
# Author complete PGS-grammar RLE bitmap payloads; palettes are an already-decoded RGBA input.
def encode_rle(a):
 out=bytearray()
 for row in a:
  x=0
  while x<len(row):
   v=int(row[x]);e=x+1
   while e<len(row) and row[e]==v and e-x<16383:e+=1
   n=e-x
   if n==1 and v:out.append(v)
   else:
    flags=(128 if v else 0)|(64 if n>=64 else 0)|((n>>8) if n>=64 else n)
    out+=bytes([0,flags])
    if n>=64:out.append(n&255)
    if v:out.append(v)
   x=e
  out+=b'\0\0'
 return bytes(out)
palette=[(0,0,0,0),(255,255,255,255),(0,0,0,128),(255,0,0,255)]
results={}
for name,w,h in [('glyphs',320,96),('sparse_hd',1920,128),('noisy',73,17)]:
 a=np.zeros((h,w),dtype='uint8')
 if name=='noisy':a=np.random.default_rng(7412).integers(0,4,size=(h,w),dtype='uint8')
 else:
  for x in range(20,w-20,24):a[20:60,x:x+14]=1;a[23:57,x+3:x+11]=0;a[60:63,x:x+16]=2
  a[65:75,32:w-32]=3
 rle=encode_rle(a);candidate,meta=transcode(rle,w,h,palette)
 raw=b''.join(b'\0'+row.tobytes() for row in a)
 ref=png(w,h,zlib.compress(raw,9),3,bytes(v for c in palette for v in c[:3]),bytes(c[3]for c in palette))
 (F/f'rle_{name}.bin').write_bytes(rle);(F/f'rle_{name}_candidate.png').write_bytes(candidate);(F/f'rle_{name}_reference.png').write_bytes(ref)
 host=np.asarray(Image.open(io.BytesIO(candidate)).convert('RGBA'));expected=np.array(palette,dtype='uint8')[a]
 meta.update({'host_rgba_exact':bool(np.array_equal(host,expected)),'reference_png_bytes':len(ref),'candidate_to_reference_size_ratio':len(candidate)/len(ref)})
 # Independent decompression from IDAT (this is oracle code, not the candidate path).
 q=candidate.index(b'IDAT');n=int.from_bytes(candidate[q-4:q],'big');meta['zlib_exact_scanlines']=zlib.decompress(candidate[q+4:q+4+n])==raw
 if name=='glyphs':
  recolor=[palette[0],(0,255,255,255),palette[2],(0,255,0,255)];recolored,rmeta=transcode(rle,w,h,recolor)
  (F/'rle_glyphs_recolored.png').write_bytes(recolored);meta['palette_change_keeps_idat']=candidate[q+4:q+4+n]==recolored[q+4:q+4+n]
  meta['controls']={'truncated':reject(lambda:transcode(rle[:-1],w,h,palette)),
   'row_overflow':reject(lambda:transcode(rle,w-1,h,palette)),
   'missing_palette':reject(lambda:transcode(rle,w,h,palette[:2])),
   'resource_cap':reject(lambda:transcode(rle,w,h,palette,max_pixels=100)),
   'trailing_data':reject(lambda:transcode(rle+b'\x01',w,h,palette))}
 results[name]=meta
save('rle_host.json',results)
# APNG default poster is deliberately not part of the animation.
W,H=96,64
poster=np.zeros((H,W,4),dtype='uint8');poster[:]=[255,0,255,255]
def compressed(a):return zlib.compress(b''.join(b'\0'+row.tobytes() for row in a),6)
b=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',W,H,8,6,0,0,0))+chunk(b'acTL',struct.pack('>II',12,0))+chunk(b'IDAT',compressed(poster))
frames=[];sequence=0
for i in range(12):
 if i in (0,4,8):w,h,x,y=W,H,0,0;blend=0
 else:w,h,x,y=24+(i%3)*8,24,(i*13)%(W-40),(i*7)%(H-24);blend=i%2
 dispose=2 if i in (2,6,8) else (1 if i in (3,7) else 0)
 a=np.zeros((h,w,4),dtype='uint8');a[:]=[(i*43+31)%256,(i*71+47)%256,(i*97+63)%256,255]
 if i not in (0,4,8):a[::3,::2]=[0,0,0,0]
 dn,dd=(7+i,100 if i%2 else 0)
 ctl=struct.pack('>IIIIIHHBB',sequence,w,h,x,y,dn,dd,dispose,blend);sequence+=1
 b+=chunk(b'fcTL',ctl);comp=compressed(a)
 # Deliberately split compressed image data into two fdAT chunks.
 for block in [comp[:len(comp)//2],comp[len(comp)//2:]]:b+=chunk(b'fdAT',struct.pack('>I',sequence)+block);sequence+=1
 frames.append({'array':a,'x':x,'y':y,'dispose':dispose,'blend':blend})
b+=chunk(b'IEND',b'');(F/'seek_animation.apng').write_bytes(b)
info=parse(b);meta={k:v for k,v in info.items() if k!='frames'};meta['frames']=[]
# Pillow independently decodes APNG frames, including their disposal/blend state.
im=Image.open(io.BytesIO(b));canvas=np.zeros((H,W,4),dtype='uint8');host=[]
for i,f in enumerate(info['frames']):
 (F/f'apng_frame_{i}.png').write_bytes(f['view']);a=frames[i]['array'];x,y=f['x'],f['y'];h,w=a.shape[:2];old=canvas.copy()
 if f['blend']==0:canvas[y:y+h,x:x+w]=a
 else:
  mask=a[:,:,3]>0;canvas[y:y+h,x:x+w][mask]=a[mask]
 im.seek(i+1);pillow=np.asarray(im.convert('RGBA'));exact=np.array_equal(canvas,pillow)
 (F/f'apng_expected_{i}.rgba').write_bytes(pillow.tobytes())
 host.append({'frame':i,'pillow_matches_authored_semantics':bool(exact),'pillow_rgba_sha256':sha(pillow.tobytes())})
 if f['dispose']==1:canvas[y:y+h,x:x+w]=0
 elif f['dispose']==2:canvas=old
 row={k:v for k,v in f.items() if k not in ('data','view')};row['compressed_bytes']=len(f['data']);meta['frames'].append(row)
meta['plans']=[plan(info,i) for i in range(12)];meta['unsafe_plan_9']=plan(info,9,unsafe_anchor=True);meta['ignore_disposal_plan_3']=plan(info,3,ignore_disposal=True);meta['host']=host
# Corrupt CRC, sequence number with corrected CRC, geometry with corrected CRC.
chunks=[];p=8
while p<len(b):
 n=int.from_bytes(b[p:p+4],'big');chunks.append((p,b[p+4:p+8],n));p+=n+12
p,_,n=next(t for t in chunks if t[1]==b'fcTL');changed=bytearray(b);changed[p+8:p+12]=struct.pack('>I',44);changed[p+8+n:p+12+n]=struct.pack('>I',zlib.crc32(changed[p+4:p+8+n])&0xffffffff)
geo=bytearray(b);geo[p+12:p+16]=struct.pack('>I',W+1);geo[p+8+n:p+12+n]=struct.pack('>I',zlib.crc32(geo[p+4:p+8+n])&0xffffffff)
badcrc=bytearray(b);badcrc[p+8+n]^=1
meta['controls']={'sequence':reject(lambda:parse(bytes(changed))),'geometry':reject(lambda:parse(bytes(geo))),'crc':reject(lambda:parse(bytes(badcrc))),'truncation':reject(lambda:parse(b[:-7])),'frame_cap':reject(lambda:parse(b,max_frames=4))}
save('animation_manifest.json',meta)
print(json.dumps({'rle':results,'apng_frames':len(info['frames']),'apng_host_exact':all(x['pillow_matches_authored_semantics']for x in host),'last_seek_plan':meta['plans'][-1]},indent=2))

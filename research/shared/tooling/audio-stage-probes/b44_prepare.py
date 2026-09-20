# SPDX-License-Identifier: Apache-2.0
import sys,pathlib,struct,json,hashlib
sys.path.insert(0,'/tmp/demuxe-audio-numeric')
import numpy as np,OpenEXR
W=130;H=98

def parse(raw):
 if raw[:8]!=struct.pack('<II',20000630,2):raise ValueError('single scanline profile')
 at=8;attrs={}
 def string():
  nonlocal at
  end=raw.index(0,at);value=raw[at:end].decode();at=end+1;return value
 while raw[at]:
  name=string();kind=string();size=struct.unpack_from('<I',raw,at)[0];at+=4
  if at+size>len(raw):raise ValueError('attribute size')
  attrs[name]=(kind,raw[at:at+size]);at+=size
 at+=1
 if attrs['compression'][1]!=bytes([6])or attrs['dataWindow'][1]!=struct.pack('<iiii',0,0,W-1,H-1)or attrs['lineOrder'][1]!=b'\0':raise ValueError('compression/window/order')
 if attrs['channels'][1]!=b'Y\0'+struct.pack('<iB3xii',1,0,1,1)+b'\0':raise ValueError('HALF/pLinear/channel')
 blocks=[]
 for cy in range((H+31)//32):
  offset=struct.unpack_from('<Q',raw,at+8*cy)[0]
  if offset+8>len(raw):raise ValueError('chunk offset')
  y,size=struct.unpack_from('<iI',raw,offset);offset+=8;rows=min(32,H-cy*32);nx=(W+3)//4;ny=(rows+3)//4
  if y!=cy*32 or size!=nx*ny*14 or offset+size>len(raw):raise ValueError('chunk shape/size')
  for by in range(ny):
   for bx in range(nx):
    pos=offset+(by*nx+bx)*14
    if raw[pos+2]>>2>=13:raise ValueError('B44A/invalid shift')
    blocks.append(pos)
 return blocks

def sample(raw,offset,x,y):
 block=raw[offset:offset+14];t=int.from_bytes(block[:2],'big');bits=int.from_bytes(block[2:],'big');shift=bits>>90;diff=[(bits>>(84-i*6))&63 for i in range(15)]
 for row in range(y):t=(t+((diff[row]-32)<<shift))&65535
 for col in range(x):t=(t+((diff[3+col*4+y]-32)<<shift))&65535
 return t&32767 if t&32768 else (~t)&65535
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);y,x=np.indices((H,W));source=((np.sin(x*.09)+np.cos(y*.07))*4+.01*x).astype(np.float16);OpenEXR.File({'compression':OpenEXR.B44_COMPRESSION}, {'Y':source}).write(str(p/'source.exr'));raw=(p/'source.exr').read_bytes();offsets=parse(raw)
with OpenEXR.File(str(p/'source.exr'),separate_channels=True)as f:decoded=f.channels()['Y'].pixels.copy()
ref=decoded.view(np.uint16);actual=np.zeros((H,W),np.uint16)
for y in range(H):
 for x in range(W):actual[y,x]=sample(raw,offsets[(y//4)*((W+3)//4)+x//4],x%4,y%4)
assert np.array_equal(actual,ref);assert not np.array_equal(decoded,source)
coords=[(x,y)for y in range(5,37)for x in range(7,39)]+[(x,y)for y in range(H-6,H)for x in range(W-7,W)];queries=np.array([y*W+x for x,y in coords],np.uint32);expected=np.array([ref[y,x]for x,y in coords],np.uint32);unique=sorted(set((y//4)*((W+3)//4)+x//4 for x,y in coords));(p/'offsets.u32').write_bytes(np.array(offsets,np.uint32).tobytes());(p/'queries.u32').write_bytes(queries.tobytes());(p/'selected-blocks.u32').write_bytes(np.array(unique,np.uint32).tobytes());(p/'reference.u32').write_bytes(expected.tobytes());(p/'decoded-half.u16').write_bytes(ref.tobytes());controls={}
for name,data in [('truncated',raw[:-1]),('version',raw[:4]+struct.pack('<I',514)+raw[8:])]:
 try:parse(data);controls[name]=False
 except (ValueError,IndexError,struct.error):controls[name]=True
wrong=[sample(raw,offsets[(y//4)*((W+3)//4)+x//4],(x+1)%4,y%4)for x,y in coords];controls['wrongPixelDetected']=wrong!=expected.tolist();assert all(controls.values())
(p/'protocol.json').write_text(json.dumps({'scope':'Real OpenEXR B44 scanline single HALF Y pLinearfalse130x98; 14byteblocks, padded right/bottom edges. Direct GPU sampling reconstructs required existing encoded half bits; compare independently decoded OpenEXR, not precompression pixels.','cost':'Five alternating existing-browser cold device/read/source-validation/upload/pipeline/direct selected half sampling plus HDR grayscale operation/readback/cleanup versus GPU expand selected unique blocks once then identical sampling/operation. <=0.9 median. No CPU full decode charged to baseline; only needed blocks expanded.'},indent=2));(p/'results.json').write_text(json.dumps({'width':W,'height':H,'blocks':len(offsets),'sourceBytes':len(raw),'samples':len(coords),'selectedBlocks':len(unique),'all12740HalfBitsExact':True,'lossyEncodingDiffersFromOriginal':True,'controls':controls,'sourceSHA256':hashlib.sha256(raw).hexdigest()},indent=2));print(len(offsets),len(coords),len(unique))

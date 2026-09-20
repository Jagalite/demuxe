# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,struct,json,subprocess,hashlib
p=Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=False);W=16;palette=[(0,0,0),(255,0,0),(0,255,0),(0,0,255)];b=bytearray(b'GIF89a'+struct.pack('<HHBBB',W,W,0xf1,0,0)+bytes(c for x in palette for c in x));canvas=bytearray(W*W*4);oracles=[];ops=[]
for n in range(48):
 w=h=16 if n==0 else 8;x=0 if n==0 else (n*3)%9;y=0 if n==0 else (n*5)%9;disposal=[1,2,1,3][n%4];local=n%2==1;interlace=n%3==2;pal=palette if not local else [palette[0],palette[3],palette[1],palette[2]];indices=bytes(1 if n==0 else (0 if (i+j+n)%5==0 else 1+(i+j+n)%3)for j in range(h)for i in range(w));saved=canvas[:]
 for j in range(h):
  for i in range(w):
   idx=indices[j*w+i]
   if idx:canvas[((y+j)*W+x+i)*4:((y+j)*W+x+i)*4+4]=bytes(pal[idx])+b'\xff'
 oracles.append(bytes(canvas));ops.append({'frame':n,'rect':[x,y,w,h],'disposal':disposal,'local_palette':local,'interlaced':interlace,'delay_cs':2})
 if disposal==2:
  for j in range(h):canvas[((y+j)*W+x)*4:((y+j)*W+x+w)*4]=bytes(w*4)
 elif disposal==3:canvas=saved
 b.extend(b'!\xf9\x04'+bytes([(disposal<<2)|1])+struct.pack('<H',2)+b'\x00\x00');b.extend(b','+struct.pack('<HHHHB',x,y,w,h,(0x81 if local else 0)|(0x40 if interlace else 0)))
 if local:b.extend(bytes(c for entry in pal for c in entry))
 order=[j for start,step in [(0,8),(4,8),(2,4),(1,2)]for j in range(start,h,step)]if interlace else list(range(h));codes=[]
 for j in order:
  for i in range(w):codes.extend([4,indices[j*w+i]])
 codes.append(5);bits=acc=0;compressed=bytearray()
 for code in codes:
  acc|=code<<bits;bits+=3
  while bits>=8:compressed.append(acc&255);acc>>=8;bits-=8
 if bits:compressed.append(acc&255)
 b.append(2)
 for i in range(0,len(compressed),255):part=compressed[i:i+255];b.append(len(part));b.extend(part)
 b.append(0)
b.append(0x3b);(p/'source.gif').write_bytes(b);(p/'oracle.rgba').write_bytes(b''.join(oracles));cmd=['ffmpeg','-v','error','-i',str(p/'source.gif'),'-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgba','-y',str(p/'host.rgba')];q=subprocess.run(cmd,capture_output=True,text=True);assert q.returncode==0,q.stderr;host=bytearray((p/'host.rgba').read_bytes());assert len(host)==48*1024
for i in range(0,len(host),4):
 if host[i+3]==0:host[i:i+3]=b'\0\0\0'
(p/'host-premultiplied-zero.rgba').write_bytes(host);assert host==b''.join(oracles),sum(x!=y for x,y in zip(host,b''.join(oracles)))
(p/'prepare-results.json').write_text(json.dumps({'frames':48,'width':16,'height':16,'frame_hashes':[hashlib.sha256(x).hexdigest()for x in oracles],'operations':ops,'oracle':'Independent authoredcompositor agreesFFmpegGIF decode after canonicalzeroRGBunderzeroalpha, matchingcanvasdisplay representation.','command':cmd},indent=2)+'\n');(p/'plan.json').write_text(json.dumps({'contract':'Real48frame GIF89a/global+localpalettes, transparency, interlace, disposal1/2/3 and20ms durations. Restricted validclear-per-literalLZW author/parser, no generalLZWclaim. Checkpoints storepostprior-disposal state every8frames, six1024B canvases. Fullvisible premultipliedRGBA exact vs independentFFmpeg/browsernative, randomseeks, incorrectlypredisposed checkpoints falsifier, retirement clearscheckpointowners.','performance':'9alternatingcoldwholejobs with48 deterministic randomrequests. Compare candidateparse+completecheckpoint preparation+seekreplay+hash+cleanup against plainforwardparse/redecode+hash and nativepersistentImageDecoder+hash+close, selectcheapestmeanbaseline; lower95saving>=10%. Nativeinternalmemoryopaque, explicitcheckpointpayload6144B plusworking/savedcanvas reported, never claim equalnative memory.'},indent=2)+'\n')

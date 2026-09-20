# SPDX-License-Identifier: Apache-2.0
import struct,zlib,sys,json,subprocess
from pathlib import Path
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False)
def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
def pixels(n,w,h):return bytes(v for y in range(h) for x in range(w) for v in ((0,0,0,0) if n%3==0 and x%7<3 else ((n*19+x*3)%256,(n*41+y*7)%256,(n*11+x+y)%256,255)))
def idat(p,w,h):return zlib.compress(b''.join(b'\0'+p[y*w*4:(y+1)*w*4] for y in range(h)))
head=struct.pack('>IIBBBBB',64,64,8,6,0,0,0);default=bytes([255,0,255,255])*4096;parts=[b'\x89PNG\r\n\x1a\n',chunk(b'IHDR',head),chunk(b'acTL',struct.pack('>II',24,0)),chunk(b'IDAT',idat(default,64,64))];seq=0;canvas=bytearray(64*64*4);oracle=[]
for n in range(24):
 y=(n%8)*8;p=pixels(n,64,8);ctl=struct.pack('>IIIIIHHBB',seq,64,8,0,y,1,24,0,0);seq+=1
 parts.extend([chunk(b'fcTL',ctl),chunk(b'fdAT',struct.pack('>I',seq)+idat(p,64,8))]);seq+=1;canvas[y*256:(y+8)*256]=p;oracle.append(bytes(canvas));(out/f'oracle-{n}.rgba').write_bytes(canvas)
parts.append(chunk(b'IEND',b''));source=b''.join(parts);(out/'source.png').write_bytes(source)
# FFmpeg rejects APNG default-image exclusion; independent normal APNG has a transparent frame0.
normal=[b'\x89PNG\r\n\x1a\n',chunk(b'IHDR',head),chunk(b'acTL',struct.pack('>II',25,0)),chunk(b'fcTL',struct.pack('>IIIIIHHBB',0,64,64,0,0,1,24,0,0)),chunk(b'IDAT',idat(bytes(16384),64,64))]
for part in parts[4:-1]:
 t=part[4:8];d=part[8:-4];normal.append(chunk(t,struct.pack('>I',struct.unpack('>I',d[:4])[0]+1)+d[4:]))
normal.append(chunk(b'IEND',b''));(out/'normal.png').write_bytes(b''.join(normal))
cmd=['ffmpeg','-v','error','-i',str(out/'normal.png'),'-f','rawvideo','-pix_fmt','rgba','-y',str(out/'host.rgba')];q=subprocess.run(cmd,capture_output=True,text=True);(out/'ffmpeg.log').write_text(q.stderr);assert q.returncode==0
host=(out/'host.rgba').read_bytes();assert host==bytes(16384)+b''.join(oracle),(len(host),len(b''.join(oracle)))
(out/'prepare-results.json').write_text(json.dumps({'frames':24,'default_image_excluded':True,'independent_ffmpeg_full_rgba_exact':True,'command':cmd},indent=2)+'\n')
(out/'plan.json').write_text(json.dumps({'contract':'RGBA8 SOURCE/NONE operations only, grayscale/color metadata absent, defaultIDAT excluded from24frame animation; fullpixel oracle and strict PNGCRC/sequence/geometry validation. Transparent SOURCE must overwrite. Reject OVER/PREVIOUS and excessiveframes/geometry.','performance':'9 alternating cold complete requests for frame23. Native ImageDecoder APNG baseline and forward perframe PNG baseline; candidate backward lastwriter planner decodes selected complete framePNGs. Charge fetch/index/PNG reconstruction/decode/fullpixel readback/hash/close. Compare against cheapest mean baseline; predeclared lower95 paired saving>=10%. No opaque native decoder memory bound claim; explicit forward/candidate owners limited one canvas+one decodedbitmap.'},indent=2)+'\n')

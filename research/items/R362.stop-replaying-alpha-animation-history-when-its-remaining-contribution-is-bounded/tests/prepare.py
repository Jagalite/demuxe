# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
from decimal import Decimal,getcontext
import struct,zlib,json,sys,subprocess
p=Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=False);getcontext().prec=100;D=Decimal;W=H=16

def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
results={}
for name,hole in [('source',False),('uncovered',True)]:
 head=struct.pack('>IIBBBBB',W,H,8,6,0,0,0);parts=[b'\x89PNG\r\n\x1a\n',chunk(b'IHDR',head),chunk(b'acTL',struct.pack('>II',48,0))];seq=0;canvas=[D(0)]*(W*H*4);saved=[]
 for n in range(48):
  x=1 if hole and n else 0;w=W-x;raw=bytearray()
  for y in range(H):
   raw.append(0)
   for xx in range(w):
    col=(n+xx+y)%3;rgb=[255 if c==col else 0 for c in range(3)];alpha=255 if n==0 else 0 if(n+xx+y)%11==0 else 192;raw.extend(rgb+[alpha]);a=D(alpha)/255;at=(y*W+x+xx)*4
    for c in range(3):canvas[at+c]=D(rgb[c])/255*a+(1-a)*canvas[at+c]
    canvas[at+3]=a+(1-a)*canvas[at+3]
  ctl=struct.pack('>IIIIIHHBB',seq,w,H,x,0,1,24,0,1);seq+=1;parts.append(chunk(b'fcTL',ctl));compressed=zlib.compress(raw)
  if n==0:parts.append(chunk(b'IDAT',compressed))
  else:parts.append(chunk(b'fdAT',struct.pack('>I',seq)+compressed));seq+=1
  if n in [46,47]:saved.append({'frame':n,'rgba_premultiplied':[float(v)for v in canvas]})
 parts.append(chunk(b'IEND',b''));(p/f'{name}.png').write_bytes(b''.join(parts));(p/f'{name}-oracle.json').write_text(json.dumps(saved)+'\n');cmd=['ffmpeg','-v','error','-i',str(p/f'{name}.png'),'-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgba','-y',str(p/f'{name}-host.rgba')];q=subprocess.run(cmd,capture_output=True,text=True);assert q.returncode==0,q.stderr;host=(p/f'{name}-host.rgba').read_bytes();assert len(host)==48*1024;last=host[-1024:];err=max(abs(D(last[i])/255*(D(last[(i//4)*4+3])/255 if i%4!=3 else 1)-canvas[i])for i in range(1024));results[name]={'actual_APNG_frames':48,'host_RGBA8_vs_declared_float_composite_max_error':float(err),'command':cmd}
(p/'prepare-results.json').write_text(json.dumps(results,indent=2)+'\n');(p/'plan.json').write_text(json.dumps({'contract':'Explicit opt-in approximation: normalized premultiplied encoded-RGB OVER composite of exactRGBA8 components using highprecision reference, no colorprofile/disposal, tolerance1/1024 eachRGBcomponent+alpha at everypixel. Not native8bit repeated-rounding APNG identity. Bounded48frame16x16 None-filterPNG components; parse actualAPNG CRC/sequence/rect+nativeinflate, no fictionaldecodesteps.','bound':'Reverse accumulate suffix A and per-pixel T; conservative nextUp(T*(255-alpha)/255) plus(4*visited+4)*EPS numericalallowance. Stop onlyallpixels bound<=1/1024; uncoveredregions retainT1. TransparentRGB contributeszero. Explicitzeroalpha/opaque and subnormalrounding guards; exactstate must fullyreplay before exactcontinuation.','performance':'9alternating complete coldsourcefetch/index/nativeinflate/componentdecode+composite/compare/ownerclose jobs forframe47, compare candidateboundedpreview against exactforwarddoublecomponentcompositor. Bothmeet declaredpreviewtolerance, no timing claim against lowerprecision native8bit path if itfailscontract. Include actualallselectedPNG payloaddecode; lower95saving>=10%.'},indent=2)+'\n')

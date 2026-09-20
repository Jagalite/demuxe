# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import struct,zlib,json,subprocess,sys
p=Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=False);w,h=67,19;raw=bytes(c for y in range(h)for x in range(w)for c in [(x*17+y*31)%256,(x*43+y*7)%256,(x*3+y*53)%256,255]);filtered=bytearray()
for y in range(h):
 typ=y%3;filtered.append(typ)
 for x in range(w*4):
  value=raw[y*w*4+x];predict=raw[y*w*4+x-4]if typ==1 and x>=4 else raw[(y-1)*w*4+x]if typ==2 and y>0 else 0;filtered.append((value-predict)&255)
def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
compressed=zlib.compress(filtered);png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',compressed[:len(compressed)//2])+chunk(b'IDAT',compressed[len(compressed)//2:])+chunk(b'IEND',b'');(p/'source.png').write_bytes(png);(p/'oracle.rgba').write_bytes(raw);cmd=['ffmpeg','-v','error','-i',str(p/'source.png'),'-f','rawvideo','-pix_fmt','rgba','-y',str(p/'host.rgba')];q=subprocess.run(cmd,capture_output=True,text=True);assert q.returncode==0,q.stderr;assert(p/'host.rgba').read_bytes()==raw
(p/'prepare-results.json').write_text(json.dumps({'width':w,'height':h,'RGBAbytes':len(raw),'inflated_bytes':len(filtered),'independentFFmpeg_exact':True,'command':cmd},indent=2)+'\n');(p/'plan.json').write_text(json.dumps({'contract':'One genuine67x19 RGBA8 opaque noninterlacedPNG, exact nativeImageDecoder/FFmpeg finalRGBA. AdmitonlyNone/Sub/Up andbounded67x19; CRC/IDAT/header/scanlength validate, Average/Paeth/interlaced/16bit/oversize reject. GPU four-byte-channel parallel Subscan and Up previousrow dependencies; write actualRGBA8storage texture.','performance':'9alternating colddevice30imagejobs. NativePNGbitmap upload/render/readback vs PNGparser+nativeDecompressionStream+inflateduintupload+GPUreconstruction/render/readback. Include fetch,inflate,decode,GPUsetup andcleanup; lower95saving>=10%. Alpha/color-profile variants excluded, no perrowinflate/network savings.'},indent=2)+'\n')

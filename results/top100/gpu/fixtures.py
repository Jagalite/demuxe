# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import struct,subprocess,json,hashlib
r=Path(__file__).parent
# Minimal uncompressed BC1 Hap packet inside a standard AVI wrapper.
def chunk(t,b):return t+struct.pack('<I',len(b))+b+(b'\0' if len(b)%2 else b'')
def lst(t,b):return chunk(b'LIST',t+b)
w,h=8,4;bc1=struct.pack('<HHI',0xf800,0,0)+struct.pack('<HHI',0x07e0,0,0);packet=len(bc1).to_bytes(3,'little')+bytes([0xab])+bc1
avih=struct.pack('<14I',1000000,0,0,0,1,0,1,len(packet),w,h,0,0,0,0)
strh=struct.pack('<4s4sIHHIIIIIIIIhhhh',b'vids',b'Hap1',0,0,0,0,1,1,0,1,len(packet),0xffffffff,0,0,0,w,h)
strf=struct.pack('<IiiHH4sIiiII',40,w,h,1,24,b'Hap1',len(packet),0,0,0,0)
body=b'AVI '+lst(b'hdrl',chunk(b'avih',avih)+lst(b'strl',chunk(b'strh',strh)+chunk(b'strf',strf)))+lst(b'movi',chunk(b'00dc',packet));(r/'hap.avi').write_bytes(chunk(b'RIFF',body));(r/'hap-packet.bin').write_bytes(packet)
hap=subprocess.check_output(['ffmpeg','-v','error','-i',str(r/'hap.avi'),'-frames:v','1','-pix_fmt','rgba','-f','rawvideo','-']);assert hap==b''.join(bytes([255,0,0,255])*4+bytes([0,255,0,255])*4 for _ in range(4))
# FLC: first frame contains 256-color palette and raw indices; second only edits one palette entry.
def fc(t,p):return struct.pack('<IH',len(p)+6,t)+p
def frame(chunks):
 data=b''.join(chunks);return struct.pack('<IHH8s',16+len(data),0xf1fa,len(chunks),bytes(8))+data
palette=bytearray(768);palette[3:6]=bytes([255,0,0]);palette[6:9]=bytes([0,255,0]);indices=bytes([1,1,2,2]*4)
f1=frame([fc(4,struct.pack('<HBB',1,0,0)+palette),fc(16,indices)]);f2=frame([fc(4,struct.pack('<HBB',1,1,1)+bytes([0,0,255]))]);header=bytearray(128);struct.pack_into('<IHHHHHHI',header,0,128+len(f1)+len(f2),0xaf12,2,4,4,8,0,1000);(r/'palette.flc').write_bytes(header+f1+f2)
flc=subprocess.check_output(['ffmpeg','-v','error','-i',str(r/'palette.flc'),'-pix_fmt','rgba','-fps_mode','passthrough','-f','rawvideo','-']);assert len(flc)==128
(r/'input.json').write_text(json.dumps({'hap':{'packet':list(packet),'rgba':list(hap),'width':8,'height':4},'flic':{'file':list(header+f1+f2),'rgbaFrames':[list(flc[:64]),list(flc[64:])],'width':4,'height':4},'oracle':'Independent host FFmpeg decode, expected solid red/green Hap pattern additionally checked'},indent=2)+'\n')

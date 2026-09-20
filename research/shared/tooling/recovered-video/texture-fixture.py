# SPDX-License-Identifier: Apache-2.0
import pathlib,struct,subprocess,json,sys,base64,hashlib
r=pathlib.Path(sys.argv[1]);r.mkdir(parents=True,exist_ok=True)
def chunk(t,b):return t+struct.pack('<I',len(b))+b+(b'\0' if len(b)%2 else b'')
def lst(t,b):return chunk(b'LIST',t+b)
w=h=128;N=32;packets=[]
for frame in range(N):
 blocks=b''.join(struct.pack('<HHI',0xf800,0x07e0,sum(((x+y+frame+i)%4)<<(2*i) for i in range(16))) for y in range(h//4) for x in range(w//4));packets.append(len(blocks).to_bytes(3,'little')+bytes([0xab])+blocks)
avih=struct.pack('<14I',33333,0,0,0,N,0,1,len(packets[0]),w,h,0,0,0,0)
strh=struct.pack('<4s4sIHHIIIIIIIIhhhh',b'vids',b'Hap1',0,0,0,0,1,30,0,N,len(packets[0]),0xffffffff,0,0,0,w,h)
strf=struct.pack('<IiiHH4sIiiII',40,w,h,1,24,b'Hap1',len(packets[0]),0,0,0,0)
body=b'AVI '+lst(b'hdrl',chunk(b'avih',avih)+lst(b'strl',chunk(b'strh',strh)+chunk(b'strf',strf)))+lst(b'movi',b''.join(chunk(b'00dc',p) for p in packets));avi=chunk(b'RIFF',body);(r/'texture-video.avi').write_bytes(avi)
command=['ffmpeg','-v','error','-i',str(r/'texture-video.avi'),'-pix_fmt','rgba','-fps_mode','passthrough','-f','rawvideo','-'];rgba=subprocess.check_output(command);assert len(rgba)==N*w*h*4
(r/'input.json').write_text(json.dumps({'avi':base64.b64encode(avi).decode(),'rgba':base64.b64encode(rgba).decode(),'width':w,'height':h,'frames':N,'oracle_command':command,'frame_hashes':[hashlib.sha256(rgba[i*w*h*4:(i+1)*w*h*4]).hexdigest() for i in range(N)]}))

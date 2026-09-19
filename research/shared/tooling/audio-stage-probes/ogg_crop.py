# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,struct,json,hashlib,sys
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);commands=[]
def call(args):
 commands.append(args);subprocess.run(args,check=True,capture_output=True)
base=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y']
call(base+['-f','lavfi','-i',r'aevalsrc=0.3*sin(2*PI*(400*t+180*t*t))+if(eq(mod(n\,6000)\,0)\,0.25\,0):s=48000:d=2','-c:a','libopus','-frame_duration','20',str(out/'source.ogg')])
data=(out/'source.ogg').read_bytes();pos=0;packets=[];pending=b''
while pos<len(data):
 assert data[pos:pos+4]==b'OggS';count=data[pos+26];laces=data[pos+27:pos+27+count];at=pos+27+count
 for n in laces:
  pending+=data[at:at+n];at+=n
  if n<255:packets.append(pending);pending=b''
 pos=at
assert packets[0].startswith(b'OpusHead') and packets[1].startswith(b'OpusTags')
pre=struct.unpack_from('<H',packets[0],10)[0];start,end=12345,67890
# Fixed 20ms generator yields TOC code 0 and config >=16: one 960-sample frame.
for p in packets[2:]:assert (p[0]&3)==0 and ((p[0]>>3)&3)==3,(p[0], 'unexpected duration')
def page(packet,seq,gp,flag):
 laces=[255]*(len(packet)//255)+[len(packet)%255];h=bytearray(b'OggS'+bytes([0,flag])+struct.pack('<QII',gp,0xA0123456,seq)+b'\0'*4+bytes([len(laces)])+bytes(laces)+packet);crc=0
 for b in h:
  crc^=b<<24
  for _ in range(8):crc=((crc<<1)^0x04c11db7) &0xffffffff if crc&0x80000000 else (crc<<1)&0xffffffff
 struct.pack_into('<I',h,22,crc);return h
n=(end+pre+959)//960
for name,skip in [('crop',pre+start),('wrong-packet-only',pre)]:
 head=bytearray(packets[0]);struct.pack_into('<H',head,10,skip);chunks=[page(head,0,0,2),page(packets[1],1,0,0)]
 for i,p in enumerate(packets[2:2+n]):chunks.append(page(p,i+2,min((i+1)*960,end+pre),4 if i==n-1 else 0))
 (out/(name+'.ogg')).write_bytes(b''.join(chunks))
for name in ['source','crop','wrong-packet-only']:
 call(base+['-i',str(out/(name+'.ogg')),'-acodec','pcm_f32le','-f','f32le',str(out/(name+'.f32'))])
src=(out/'source.f32').read_bytes();crop=(out/'crop.f32').read_bytes();expected=src[start*4:end*4];bad=(out/'wrong-packet-only.f32').read_bytes();assert crop==expected,(len(crop),len(expected));assert bad!=expected
result={'passed':True,'candidate_executed':True,'fallback':False,'profile':'mono Ogg Opus interior sample crop; all prefix packets retained for exact decoder state','source_preskip':pre,'crop_preskip':pre+start,'start_sample':start,'end_sample':end,'output_samples':len(crop)//4,'expected_samples':end-start,'host_exact':True,'packet_only_control_samples':len(bad)//4,'packet_only_control_rejected':True,'retained_audio_packets':n,'compressed_payloads_identical':True,'limits':['retains complete compressed prefix; no minimal-preroll claim','host FFmpeg and browser decodeAudioData are separate destinations','not MP4/WebM/MSE mapping or concatenation qualification']}
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');(out/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print(json.dumps(result))

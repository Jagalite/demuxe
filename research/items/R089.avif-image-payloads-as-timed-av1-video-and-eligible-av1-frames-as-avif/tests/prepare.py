# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,subprocess,json,struct,hashlib
r=Path(sys.argv[1]);log=[]
def run(a):
 log.append(a);p=subprocess.run(a,capture_output=True);(r/'commands.log').write_text('\n'.join(' '.join(x) for x in log)+'\n');
 if p.returncode:raise RuntimeError(p.stderr.decode())
 return p.stdout
def packetdata(path):
 j=json.loads(run(['ffprobe','-v','error','-select_streams','v','-show_packets','-show_data','-of','json',str(path)]));return [bytes.fromhex(''.join(line.split(':',1)[1].split('  ')[0].replace(' ','') for line in p['data'].strip().splitlines())) for p in j['packets']]
def obus(d):
 result=[];i=0
 while i<len(d):
  h=d[i];t=(h>>3)&15;i+=1
  if h&4:i+=1
  assert h&2;size=0;shift=0
  while True:
   b=d[i];i+=1;size|=(b&127)<<shift;shift+=7
   if b<128:break
  result.append((t,d[i:i+size]));i+=size
 return result
payloads=[];seqs=[];refs=[]
for n in range(3):
 raw=bytes((16+((x*2+y+n*53)%220)) for y in range(64) for x in range(64))+bytes([128])*2048;(r/f'input{n}.yuv').write_bytes(raw)
 run(['build/catalogue-tools/aom-build/aomenc','--ivf','--limit=1','--usage=2','--cpu-used=8','--lossless=1','--width=64','--height=64','--fps=2/1','--color-primaries=1','--transfer-characteristics=1','--matrix-coefficients=1','--color-range=0','--output='+str(r/f'image{n}.ivf'),str(r/f'input{n}.yuv')])
 run(['ffmpeg','-v','error','-i',str(r/f'image{n}.ivf'),'-c:v','copy',str(r/f'image{n}.avif')]);payload=packetdata(r/f'image{n}.avif')[0];payloads.append(payload);seq=next(p for t,p in obus(payload) if t==1);seqs.append(seq);refs.append(run(['ffmpeg','-v','error','-i',str(r/f'image{n}.avif'),'-f','rawvideo','-pix_fmt','yuv420p','-']))
assert len(set(seqs))==1
header=bytearray((r/'image0.ivf').read_bytes()[:32]);struct.pack_into('<I',header,24,3);struct.pack_into('<II',header,16,2,1);(r/'combined.ivf').write_bytes(header+b''.join(struct.pack('<IQ',len(d),n)+d for n,d in enumerate(payloads)))
for name,flags in [('video.mp4','+faststart'),('fragmented.mp4','empty_moov+default_base_moof+frag_every_frame')]:run(['ffmpeg','-v','error','-i',str(r/'combined.ivf'),'-c:v','copy','-movflags',flags,str(r/name)])
mp4=packetdata(r/'video.mp4');assert mp4==payloads
actual=run(['ffmpeg','-v','error','-i',str(r/'video.mp4'),'-f','rawvideo','-pix_fmt','yuv420p','-']);assert actual==b''.join(refs)
reverse=[]
for n in range(3):
 run(['ffmpeg','-v','error','-ss',str(n/2),'-i',str(r/'video.mp4'),'-frames:v','1','-c:v','copy',str(r/f'reverse{n}.avif')]);d=packetdata(r/f'reverse{n}.avif')[0];assert d==payloads[n];reverse.append(hashlib.sha256(d).hexdigest())
(r/'prepare-results.json').write_text(json.dumps({'payload_hashes':reverse,'matching_sequence_header':seqs[0].hex(),'seq_profile':seqs[0][0]>>5,'still_picture':(seqs[0][0]>>4)&1,'reduced_still_picture_header':(seqs[0][0]>>3)&1,'full_host_i420_exact':True,'frames':3,'times':[0,.5,1],'forward_and_reverse_payloads_exact':True},indent=2));print((r/'prepare-results.json').read_text())

# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import socket,subprocess,json,sys,hashlib,struct,threading
p=Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);source=Path(sys.argv[2]);tables=json.loads(Path(sys.argv[3]).read_text())['defaultDht'];sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);sock.bind(('127.0.0.1',0));sock.settimeout(.5);port=sock.getsockname()[1];packets=[];stop=False
cmd=['ffmpeg','-v','error','-i',str(source),'-map','0:v:0','-frames:v','1','-c:v','copy','-f','rtp',f'rtp://127.0.0.1:{port}?pkt_size=600&rtcpport={port}']
def receive():
 while not stop:
  try:
   b=sock.recv(65536)
   if len(b)>=12 and (b[1]&127)==26:packets.append(b)
  except socket.timeout:pass
thread=threading.Thread(target=receive);thread.start();r=subprocess.run(cmd,capture_output=True);stop=True;thread.join();sock.close();(p/'sender.stdout').write_bytes(r.stdout);(p/'sender.stderr').write_bytes(r.stderr);(p/'commands.log').write_text(' '.join(cmd)+'\n');assert r.returncode==0,r.stderr.decode();assert packets; (p/'rtp-packets.json').write_text(json.dumps([list(b) for b in packets]))
def reconstruct(packets):
 fragments=[];key=None;quant=None;markers=0
 for b in packets:
  if len(b)<20 or b[0]!=128 or (b[1]&127)!=26:raise ValueError('RTP profile')
  timestamp=int.from_bytes(b[4:8],'big');ssrc=int.from_bytes(b[8:12],'big');j=b[12:];offset=int.from_bytes(j[1:4],'big');kind,Q,w,h=j[4:8]
  if j[0]!=0 or kind not in [0,1] or Q<128 or w==0 or h==0:raise ValueError('explicit tables/profile')
  identity=(timestamp,ssrc,kind,Q,w,h)
  if key is None:key=identity
  elif identity!=key:raise ValueError('frame geometry/source identity')
  at=8
  if offset==0:
   if len(j)<12 or j[8]!=0 or j[9]!=0:raise ValueError('quant precision')
   length=int.from_bytes(j[10:12],'big')
   if length not in [64,128] or len(j)<12+length:raise ValueError('missing quant tables')
   quant=j[12:12+length];at+=4+length
  fragments.append((offset,j[at:],bool(b[1]&128)));markers+=bool(b[1]&128)
 if quant is None or markers!=1:raise ValueError('tables/completeness')
 fragments.sort();entropy=bytearray()
 for i,(offset,b,marker) in enumerate(fragments):
  if offset!=len(entropy) or marker!=(i==len(fragments)-1):raise ValueError('fragment gap/overlap/marker')
  entropy.extend(b)
 timestamp,ssrc,kind,Q,w,h=key;w*=8;h*=8
 seg=lambda t,b:bytes([255,t])+struct.pack('>H',len(b)+2)+b
 dqt=b'\x00'+quant[:64]+(b'\x01'+quant[64:] if len(quant)==128 else b'')
 if len(quant)==64:raise ValueError('two-table profile required')
 sof=bytes([8])+struct.pack('>HH',h,w)+bytes([3,1,0x21 if kind==0 else 0x22,0,2,0x11,1,3,0x11,1]);sos=bytes([3,1,0,2,0x11,3,0x11,0,63,0]);scan=bytes(entropy);jpeg=b'\xff\xd8'+seg(219,dqt)+seg(192,sof)+bytes(tables)+seg(218,sos)+scan+(b'' if scan.endswith(b'\xff\xd9') else b'\xff\xd9');return jpeg,{'width':w,'height':h,'timestamp':timestamp,'ssrc':ssrc,'type':kind,'Q':Q,'quantBytes':len(quant),'scan':scan.removesuffix(b'\xff\xd9')}
jpeg,meta=reconstruct(packets);(p/'reconstructed.jpg').write_bytes(jpeg)
def scan(b):
 i=2
 while i<len(b):
  assert b[i]==255;typ=b[i+1];n=int.from_bytes(b[i+2:i+4],'big');i+=2+n
  if typ==218:return b[i:].removesuffix(b'\xff\xd9')
 raise ValueError('scan')
assert meta['scan']==scan(source.read_bytes());negative={};bad_geometry=[bytearray(b) for b in packets];bad_geometry[-1][18]^=1;bad_tables=[bytearray(b) for b in packets];first=next(i for i,b in enumerate(bad_tables) if b[13:16]==b'\x00\x00\x00');bad_tables[first][22:24]=b'\x00\x00'
for name,bad in [('missing-fragment',packets[:1]+packets[2:]),('changed-geometry',bad_geometry),('missing-tables',bad_tables)]:
 try:reconstruct(bad)
 except ValueError as e:negative[name]=str(e)
assert len(negative)==3
outputs=[]
for f in [source,p/'reconstructed.jpg']:
 cmd=['ffmpeg','-v','error','-i',str(f),'-frames:v','1','-pix_fmt','rgba','-f','rawvideo','-'];r=subprocess.run(cmd,capture_output=True);assert r.returncode==0;outputs.append(r.stdout)
assert outputs[0]==outputs[1];(p/'reference.rgba').write_bytes(outputs[0]);d={'packetCount':len(packets),'sourceJPEGsha256':hashlib.sha256(source.read_bytes()).hexdigest(),'reconstructedJPEGsha256':hashlib.sha256(jpeg).hexdigest(),'entropySHA256':hashlib.sha256(meta.pop('scan')).hexdigest(),'metadata':meta,'hostFullPixelsExact':True,'hostRGBAsha256':hashlib.sha256(outputs[0]).hexdigest(),'negativeControls':negative,'reconstructionBytes':len(jpeg),'defaultHuffmanSource':str(sys.argv[3])};(p/'preparation.json').write_text(json.dumps(d,indent=2));print(json.dumps(d))

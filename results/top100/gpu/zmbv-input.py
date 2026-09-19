# SPDX-License-Identifier: Apache-2.0
import json,subprocess,zlib
from pathlib import Path
p=Path(__file__).parent;b=(p/'zmbv.avi').read_bytes();packets=[]
def chunks(start,end):
 while start+8<=end:
  tag=b[start:start+4];n=int.from_bytes(b[start+4:start+8],'little');payload=start+8
  if tag in (b'RIFF',b'LIST'):chunks(payload+4,payload+n)
  elif tag==b'00dc' and n:packets.append(b[payload:payload+n])
  start=payload+n+(n%2)
chunks(0,len(b));raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'zmbv.avi'),'-pix_fmt','bgr0','-fps_mode','passthrough','-f','rawvideo','-']);assert len(raw)==4096*len(packets)
d=zlib.decompressobj();sizes=[]
for pkt in packets:sizes.append(len(d.decompress(pkt[7:] if pkt[0]&1 else pkt[1:])))
(p/'zmbv-input.json').write_text(json.dumps({'packets':[list(x) for x in packets],'oracle':[list(raw[i:i+4096]) for i in range(0,len(raw),4096)],'hostInflatedSizes':sizes}))

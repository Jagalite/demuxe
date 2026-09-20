# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,hashlib,sys,av
r=Path(sys.argv[1]);result=json.loads((r/'result.json').read_text());packet=bytes(json.loads(Path('results/top100/webrtc/packet.json').read_text()));
def nals(b):
 start=[];i=0
 while i<len(b)-3:
  if b[i:i+3]==b'\x00\x00\x01':start.append((i,3));i+=3
  elif b[i:i+4]==b'\x00\x00\x00\x01':start.append((i,4));i+=4
  else:i+=1
 return [b[p+n:start[j+1][0] if j+1<len(start) else len(b)] for j,(p,n) in enumerate(start)]
expected=nals(packet);container=av.open('results/catalogue-current/opus/original.ogg');audio=[bytes(p) for p in container.demux(audio=0) if p.size];container.close();checks=[]
for p in result.get('probes',[result['probe']]):
 video=[nals(bytes(x['bytes']))==expected for x in p['received']['video']];audioIndices=[audio.index(bytes(x['bytes'])) for x in p['received']['audio']];assert all(video);assert all(b>a for a,b in zip(audioIndices,audioIndices[1:]));assert p['server']['counts']['h264Encode']==p['server']['counts']['opusEncode']==0;assert p['server']['tracksStopped'] and p['server']['peersRemaining']==0;assert p['offerContainsMdns'];checks.append({'videoNALListsExact':video,'audioSourcePacketIndices':audioIndices,'nativeRed':p['pixel'],'nativeToneHz':p['hz'],'encoderCalls':0,'normalMdnsPrivacy':True,'allOwnersClosed':True})
wrong=bytearray(packet);wrong[-1]^=1;assert nals(wrong)!=expected
(r/'identity.json').write_text(json.dumps({'checks':checks,'wrongPacketDetected':True,'passed':True,'scope':'Exact coded payload and native marked H264/Opus live packet stream; no file pre-skip/end-trim or arbitrary codec source claim.'},indent=2)+'\n');print(json.dumps(checks))

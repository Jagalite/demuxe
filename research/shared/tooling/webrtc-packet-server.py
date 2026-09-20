# SPDX-License-Identifier: Apache-2.0
import asyncio,json,time,sys,pathlib,fractions,hashlib
from aiohttp import web
from aiortc import RTCPeerConnection,RTCSessionDescription,RTCConfiguration,RTCRtpSender,MediaStreamTrack
from aiortc.mediastreams import MediaStreamError
from aiortc.codecs.h264 import H264Encoder
from aiortc.codecs.opus import OpusEncoder
import av
out=pathlib.Path(sys.argv[1]);peers={};counts={'h264Encode':0,'opusEncode':0,'h264Pack':0,'opusPack':0}
for cls,name in [(H264Encoder,'h264'),(OpusEncoder,'opus')]:
 for method,suffix in [('encode','Encode'),('pack','Pack')]:
  original=getattr(cls,method)
  def wrapped(self,*a,_fn=original,_key=name+suffix,**kw):counts[_key]+=1;return _fn(self,*a,**kw)
  setattr(cls,method,wrapped)
video=bytes(json.loads(pathlib.Path('results/top100/webrtc/packet.json').read_text()));container=av.open('results/catalogue-current/opus/original.ogg');audio=[bytes(p) for p in container.demux(audio=0) if p.size];container.close()
class PacketTrack(MediaStreamTrack):
 def __init__(self,kind):super().__init__();self.kind=kind;self.index=0;self.started=None;self.samples=video if kind=='video' else audio;self.step=7500 if kind=='video' else 960;self.rate=90000 if kind=='video' else 48000
 async def recv(self):
  if self.readyState!='live':raise MediaStreamError
  if self.started is None:self.started=time.monotonic()
  await asyncio.sleep(max(0,self.started+self.index*self.step/self.rate-time.monotonic()))
  packet=av.Packet(video if self.kind=='video' else audio[self.index%len(audio)]);packet.pts=packet.dts=self.index*self.step;packet.time_base=fractions.Fraction(1,self.rate);self.index+=1;return packet
async def offer(request):
 params=await request.json();pc=RTCPeerConnection(RTCConfiguration(iceServers=[]));id=str(len(peers));tracks=[PacketTrack('video'),PacketTrack('audio')];peers[id]=(pc,tracks)
 await pc.setRemoteDescription(RTCSessionDescription(sdp=params['sdp'],type=params['type']))
 for track in tracks:
  pc.addTrack(track)
  codec='video/H264' if track.kind=='video' else 'audio/opus'
  for tr in pc.getTransceivers():
   if tr.kind==track.kind:tr.setCodecPreferences([c for c in RTCRtpSender.getCapabilities(track.kind).codecs if c.mimeType.lower()==codec.lower() and (track.kind!='video' or str(c.parameters.get('packetization-mode'))=='1')])
 await pc.setLocalDescription(await pc.createAnswer());return web.json_response({'sdp':pc.localDescription.sdp,'type':pc.localDescription.type,'id':id})
async def close(request):
 id=(await request.json())['id'];pc,tracks=peers.pop(id)
 for t in tracks:t.stop()
 await pc.close();return web.json_response({'counts':counts,'tracksStopped':all(t.readyState=='ended' for t in tracks),'peersRemaining':len(peers)})
async def index(request):return web.Response(text='<html><video autoplay playsinline></video></html>',content_type='text/html')
async def main():
 app=web.Application();app.router.add_get('/',index);app.router.add_post('/offer',offer);app.router.add_post('/close',close);runner=web.AppRunner(app);await runner.setup();site=web.TCPSite(runner,'127.0.0.1',0);await site.start();print(json.dumps({'origin':'http://127.0.0.1:'+str(site._server.sockets[0].getsockname()[1])}),flush=True);await asyncio.Event().wait()
try:asyncio.run(main())
finally:(out/'server-counts.json').write_text(json.dumps(counts,indent=2)+'\n')

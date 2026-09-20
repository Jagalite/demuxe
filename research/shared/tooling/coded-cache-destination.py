# SPDX-License-Identifier: Apache-2.0
import av,pathlib,sys,json,hashlib,subprocess,gc,fractions
out=pathlib.Path(sys.argv[1]);cache={};owners=[];sha=lambda x:hashlib.sha256(x).hexdigest()
for name in ['source.mp4','source.mkv','source-fragmented.mp4']:
 p=out/name;c=av.open(str(p));s=c.streams.video[0];config=bytes(s.codec_context.extradata);o={'name':name,'config':config,'packets':[]}
 for pkt in c.demux(s):
  if not pkt.size:continue
  b=bytes(pkt);key=(sha(config),sha(b));b=cache.setdefault(key,b);o['packets'].append((b,pkt.pts,pkt.dts,pkt.duration,pkt.time_base))
 owners.append(o);c.close()
def decode(o):
 d=av.CodecContext.create('h264','r');d.extradata=o['config'];frames=[]
 def collect(f):
  f=f.reformat(format='yuv420p');planes=[]
  for i,p in enumerate(f.planes):
   w=f.width if i==0 else f.width//2;h=f.height if i==0 else f.height//2;raw=bytes(p);planes.extend(raw[y*p.line_size:y*p.line_size+w] for y in range(h))
  frames.append(b''.join(planes))
 for b,pts,dts,duration,tb in o['packets']:
  p=av.Packet(b);p.pts=pts;p.dts=dts;p.duration=duration;p.time_base=tb
  for f in d.decode(p):collect(f)
 for f in d.decode(None):collect(f)
 return b''.join(frames)
rows=[]
for o in owners:
 reference=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(out/o['name']),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']);actual=decode(o);assert actual==reference;rows.append({'name':o['name'],'framesExact':len(actual)//23040,'sha256':sha(actual)})
del owners[0];gc.collect();assert sha(decode(owners[0]))==rows[1]['sha256'];result={'rows':rows,'retiredOneOwnerSurvivorExact':True,'sharedPayloadObjects':len(cache),'passed':True};(out/'destination-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

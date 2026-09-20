# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
source=out/'source.mp4';reference=out/'reference-remux.mp4'
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=3','-vf','setsar=1/1','-c:v','libx264','-bf','2','-g','30','-movflags','+faststart',str(source)],check=True)
subprocess.run(['ffmpeg','-v','error','-i',str(source),'-c','copy','-bsf:v','h264_metadata=sample_aspect_ratio=4/3','-movflags','+faststart',str(reference)],check=True)
def boxes(b,a=0,end=None):
 end=len(b) if end is None else end
 while a<end:
  if a+8>end:raise ValueError('shortbox')
  n=int.from_bytes(b[a:a+4],'big');t=b[a+4:a+8]
  if n<8 or a+n>end:raise ValueError('box bounds')
  yield t,a,n;a+=n

def entry(b):
 def descend(a,end):
  for t,p,n in boxes(b,a,end):
   if t==b'avc1':return p,n
   if t in [b'moov',b'trak',b'mdia',b'minf',b'stbl',b'stsd']:
    r=descend(p+8+(8 if t==b'stsd' else 0),p+n)
    if r:return r
 return descend(0,len(b))
def configuration(b):
 p,n=entry(b);children=list(boxes(b,p+86,p+n));c=next((p,n) for t,p,n in children if t==b'avcC');off=c[0]+8;assert b[off]==1 and b[off+5]&31==1;length=int.from_bytes(b[off+6:off+8],'big');sps=(off+8,length);aspect=next((p,n) for t,p,n in children if t==b'pasp');assert aspect[1]==16;return sps,aspect

def patch(b,sps):
 (at,n),(p,size)=configuration(b)
 if n!=len(sps):raise ValueError('SPS length changed')
 if b[at]&31!=7 or sps[0]&31!=7:raise ValueError('SPS type')
 candidate=bytearray(b);candidate[at:at+n]=sps;candidate[p+8:p+16]=(4).to_bytes(4,'big')+(3).to_bytes(4,'big');return bytes(candidate)
a=source.read_bytes();ref=reference.read_bytes();(p,n),_=configuration(ref);b=patch(a,ref[p:p+n]);(out/'candidate.mp4').write_bytes(b)
try:patch(a,ref[p:p+n]+b'0');raise AssertionError('length accepted')
except ValueError:pass
try:patch(a,bytes([1])+ref[p+1:p+n]);raise AssertionError('type accepted')
except ValueError:pass

def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-show_data_hash','sha256','-of','json',str(path)]))
x,y=probe(source),probe(out/'candidate.mp4');assert [{k:p.get(k) for k in ['pts','dts','duration','data_hash','flags']} for p in x['packets']]==[{k:p.get(k) for k in ['pts','dts','duration','data_hash','flags']} for p in y['packets']]
def frames(path):
 b=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']);return [hashlib.sha256(b[a:a+86400]).hexdigest() for a in range(0,len(b),86400)]
assert frames(source)==frames(out/'candidate.mp4');assert len(frames(source))==90
changes=[i for i,(u,v) in enumerate(zip(a,b)) if u!=v];result={'sourceBytes':len(a),'candidateBytes':len(b),'changedOffsets':changes,'sps':configuration(a)[0],'pasp':configuration(a)[1],'packetPayloadFlagsAndTimesExact':True,'bFramesPresent':any(p['pts']!=p['dts'] for p in x['packets']),'framesExact':90,'sourceSAR':x['streams'][0]['sample_aspect_ratio'],'candidateSAR':y['streams'][0]['sample_aspect_ratio'],'wrongLengthRejected':True,'wrongNALTypeRejected':True};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(result)

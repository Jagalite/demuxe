# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib,struct
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T203300Z-preroll-excerpt';source=r/'source.mp4';data=source.read_bytes();identity=hashlib.sha256(data).hexdigest();commands=[]
def run(args):
 commands.append(args);p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 with (r/'stderr.log').open('ab') as f:f.write(p.stderr)
 if p.returncode:raise ValueError(p.stderr.decode())
 return p.stdout
def boxes(b,start=0,end=None):
 end=len(b) if end is None else end
 while start<end:
  size=int.from_bytes(b[start:start+4],'big');typ=b[start+4:start+8]
  if size<8 or start+size>end:raise ValueError('box bounds')
  yield typ,start,size;start+=size
root=list(boxes(data));moofs=[(a,n) for t,a,n in root if t==b'moof'];init=data[:moofs[0][0]];entries=[]
for a,n in moofs:
 mdatsize=int.from_bytes(data[a+n:a+n+4],'big');assert data[a+n+4:a+n+8]==b'mdat';dts=None
 for t,b,z in boxes(data,a+8,a+n):
  if t==b'traf':
   track=None;time=None
   for k,c,w in boxes(data,b+8,b+z):
    if k==b'tfhd':track=int.from_bytes(data[c+12:c+16],'big')
    if k==b'tfdt':time=int.from_bytes(data[c+12:c+20] if data[c+8]==1 else data[c+12:c+16],'big')
   if track==1:dts=time
 assert dts is not None
 span=data[a:a+n+mdatsize];entries.append({'start':a,'size':len(span),'videoDTS':dts,'spanSHA256':hashlib.sha256(span).hexdigest()})
assert len(entries)==5
index={'sourceSHA256':identity,'sourceBytes':len(data),'videoTimescale':12288,'entries':entries};(r/'seek-map.json').write_text(json.dumps(index,indent=2)+'\n')
def fetch(which,version,override=None):
 if version!=identity:raise ValueError('source identity')
 selected=[]
 for i in which:
  x=(override or entries)[i];a,n=x['start'],x['size']
  if a<0 or n<8 or a+n>len(data):raise ValueError('span bounds')
  span=data[a:a+n]
  if hashlib.sha256(span).hexdigest()!=x['spanSHA256']:raise ValueError('span integrity')
  selected.append(span)
 return init+b''.join(selected)
(r/'candidate.mp4').write_bytes(fetch([1,2,3],identity));(r/'broken-no-preroll.mp4').write_bytes(fetch([2,3],identity));controls=[]
for name,version,over in [('same-name-changed-source','changed',None),('outside-offset',identity,[{**x,'start':len(data)+1} for x in entries]),('corrupt-offset',identity,[{**x,'start':x['start']+1} for x in entries])]:
 try:fetch([1],version,over);raise AssertionError('accepted '+name)
 except ValueError:controls.append(name)
# Both decode with original absolute timestamps. Public start3.35 is covered by frame at3.3333; last frame7.625 covers end7.65.
vfilter="select='gte(t,3.333333)*lt(t,7.65)'"
def decode(file):
 video=run(['ffmpeg','-v','error','-copyts','-i',str(file),'-map','0:v:0','-vf',vfilter,'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'])
 audio=run(['ffmpeg','-v','error','-copyts','-i',str(file),'-map','0:a:0','-af','atrim=start=3.35:end=7.65','-f','f32le','-'])
 return video,audio
full=decode(source);candidate=decode(r/'candidate.mp4');bad=decode(r/'broken-no-preroll.mp4');assert full==candidate and full!=bad;assert len(full[1])//4==206400
# Independent FFprobe packet/time oracle for selected complete fragment spans.
probe=lambda file:json.loads(run(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(file)]))['packets']
a=probe(source);b=probe(r/'candidate.mp4');selected=[p for p in a if any(x['start']<=int(p['pos'])<x['start']+x['size'] for x in entries[1:4])]
assert len(selected)==len(b)
for x,y in zip(selected,b):
 for key in ['stream_index','pts','dts','duration','data_hash']:assert x[key]==y[key]
(r/'results.json').write_text(json.dumps({'passed':True,'candidateExecuted':True,'fallback':False,'sourceBytes':len(data),'candidateBytes':(r/'candidate.mp4').stat().st_size,'coldIndexRequiresFullSourceBytes':len(data),'repeatedQueryMetadataBytes':(r/'seek-map.json').stat().st_size,'requestedSeconds':[3.35,7.65],'visibleCoveringFrameInterval':[3.3333333333333335,7.666666666666667],'decodedFrames':len(full[0])//(160*96*3//2),'audioSamples':len(full[1])//4,'completePixelsAndPCMExact':True,'copiedPacketsPayloadTimingExact':len(b),'prerollOmissionDiverges':True,'sourceBoundMapControlsRejected':controls,'scope':'Host finite indexed fragment window with original B-frame AVC plus FLAC, decoded-output trim oracle. No re-encoding coded samples; public browser interval suppression/pause/replay/cancel and appendWindowStart adverse control not yet executed. Map built by full cold parse, not evidence current FFmpeg rescans or that another map owner saves work.'},indent=2)+'\n');(r/'commands.log').write_text('\n'.join(json.dumps(c) for c in commands)+'\n')

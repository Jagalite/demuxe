# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,hashlib
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);be=lambda n,k:n.to_bytes(k,'big')
def segment(t,typ,b):return b'PG'+be(t,4)+be(t,4)+bytes([typ])+be(len(b),2)+b
def pcs(number,count,update=False):return be(160,2)+be(96,2)+bytes([0x10])+be(number,2)+bytes([0x80 if number==0 else 0,0x80 if update else 0,0,count])+(be(0,2)+bytes([0,0])+be(20,2)+be(30,2) if count else b'')
rle=bytes([0,8,0,0x90,1,0,0x90,2,0,24,0,0])*16;obj=be(0,2)+bytes([0,0xc0])+be(len(rle)+4,3)+be(64,2)+be(16,2)+rle
palette=lambda version:bytes([0,version,0,16,128,128,0,1,235 if version==0 else 16,128,128,255,2,235,128,128,128])
segments=[(45000,0x16,pcs(0,1)),(45000,0x17,bytes([1,0])+be(0,2)+be(0,2)+be(160,2)+be(96,2)),(45000,0x14,palette(0)),(45000,0x15,obj),(45000,0x80,b''),(67500,0x16,pcs(1,1,True)),(67500,0x14,palette(1)),(67500,0x80,b''),(135000,0x16,pcs(2,0)),(135000,0x80,b'')];data=b''.join(segment(*s) for s in segments);(p/'runs.sup').write_bytes(data)
def spans(rle,w,h):
 out=[];i=0;x=0;y=0
 while i<len(rle):
  c=rle[i];i+=1
  if c:n=1
  else:
   if i>=len(rle):raise ValueError('truncated run')
   flags=rle[i];i+=1
   if flags==0:
    if x!=w:raise ValueError('row width')
    y+=1;x=0;continue
   n=flags&63
   if flags&64:
    if i>=len(rle):raise ValueError('long run')
    n=(n<<8)|rle[i];i+=1
   c=0
   if flags&128:
    if i>=len(rle):raise ValueError('missing color')
    c=rle[i];i+=1
  if n<=0 or x+n>w or y>=h:raise ValueError('oversized run')
  if c:out.append([y,x,n,c])
  x+=n
 if y!=h or x:raise ValueError('incomplete image')
 return out
def parse(data):
 at=0;events=[];active=False;palette={};runs=[]
 while at<len(data):
  if at+13>len(data) or data[at:at+2]!=b'PG':raise ValueError('segment header')
  pts=int.from_bytes(data[at+2:at+6],'big');typ=data[at+10];n=int.from_bytes(data[at+11:at+13],'big');body=data[at+13:at+13+n];at+=13+n
  if len(body)!=n:raise ValueError('segment bounds')
  if typ==0x16:
   if body[10] not in [0,1]:raise ValueError('object count')
   active=bool(body[10])
   if active and (int.from_bytes(body[15:17],'big'),int.from_bytes(body[17:19],'big'))!=(20,30):raise ValueError('profile placement')
  elif typ==0x14:
   for i in range(2,len(body),5):
    index,Y,cr,cb,a=body[i:i+5]
    if cr!=128 or cb!=128:raise ValueError('profile chroma')
    palette[index]=[Y,a]
  elif typ==0x15:
   if body[3]!=0xc0:raise ValueError('fragmented object')
   w=int.from_bytes(body[7:9],'big');h=int.from_bytes(body[9:11],'big')
   if (w,h)!=(64,16):raise ValueError('profile geometry')
   runs=spans(body[11:],w,h)
  elif typ==0x80:events.append({'pts':pts/90000,'active':active,'palette':dict(palette),'runs':runs})
 return events
parsed=parse(data);runs=parsed[0]['runs'];assert len(runs)==32;negative=0
for bad in [rle[:-1],bytes([0,0xbf,1])+rle]:
 try:spans(bad,64,16)
 except ValueError:negative+=1
assert negative==2
cmd=['ffmpeg','-v','error','-copyts','-f','lavfi','-i','color=black:s=160x96:r=4:d=2','-i',str(p/'runs.sup'),'-filter_complex','[0:v]settb=1/1000,setpts=PTS+125[v];[v][1:s]overlay','-t','2.1','-fps_mode','passthrough','-enc_time_base','1/1000','-pix_fmt','rgba','-f','rawvideo',str(p/'reference.rgba')];proc=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE);(p/'oracle.log').write_bytes(proc.stderr);assert proc.returncode==0
raw=(p/'reference.rgba').read_bytes();assert len(raw)==8*61440
refevents=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','s','-show_frames','-of','json',str(p/'runs.sup')]))['frames'];assert [(x['pts'],x['num_rects']) for x in refevents]==[(500000,1),(750000,1),(1500000,0)]
states=[];controls=[]
for state,index in [(0,0),(1,2),(2,3)]:
 expected=bytearray([0,0,0,255]*(160*96))
 if state:
  for y,x,n,c in runs:
   Y,a=parsed[state-1]['palette'][c];blended=(Y*a+16*(255-a))//255;v=max(0,min(255,round((blended-16)*255/219)))
   for j in range(n):
    off=((30+y)*160+20+x+j)*4;expected[off:off+4]=bytes([v,v,v,255])
 actual=raw[index*61440:(index+1)*61440];diff=[abs(a-b) for a,b in zip(expected,actual)];controls.append({'state':state,'exact':not any(diff),'maxError':max(diff),'mismatches':sum(x!=0 for x in diff)});states.append({'state':state,'hash':hashlib.sha256(actual).hexdigest(),'reference':list(actual)})
(p/'input.json').write_text(json.dumps({'events':parsed,'runs':runs,'width':64,'height':16,'states':states,'referenceEvents':refevents,'negativeParserControls':negative}));(p/'preparation.json').write_text(json.dumps({'realPGS':True,'segments':len(segments),'runCount':len(runs),'negativeParserControls':negative,'referenceControls':controls},indent=2));(p/'commands.log').write_text(' '.join(cmd)+'\nffprobe -show_frames runs.sup\n');print(controls)

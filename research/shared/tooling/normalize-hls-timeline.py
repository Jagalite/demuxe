# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,struct,hashlib,sys
out=pathlib.Path(sys.argv[1]);source=pathlib.Path('results/top100/hls/prepared.mp4');b=bytearray(source.read_bytes());patches=[]
def boxes(start,end):
 p=start
 while p<end:
  n=int.from_bytes(b[p:p+4],'big');typ=bytes(b[p+4:p+8]).decode('ascii');assert n>=8 and p+n<=end;yield p,n,typ;p+=n
for p,n,t in boxes(0,len(b)):
 if t!='moof':continue
 for q,k,tt in boxes(p+8,p+n):
  if tt!='traf':continue
  children=list(boxes(q+8,q+k));tfhd=next(x for x in children if x[2]=='tfhd')[0];track=int.from_bytes(b[tfhd+12:tfhd+16],'big');scale={1:12288,2:48000}[track]
  tfdt=next(x for x in children if x[2]=='tfdt')[0];width=8 if b[tfdt+8]==1 else 4;pos=tfdt+12;old=int.from_bytes(b[pos:pos+width],'big');assert old>=scale;b[pos:pos+width]=(old-scale).to_bytes(width,'big');patches.append({'track':track,'offset':pos,'before':old,'after':old-scale,'timescale':scale})
(out/'normalized.mp4').write_bytes(b)
def packets(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(p)]))['packets']
a=packets('results/full-completion/continuity/red.mp4');c=packets(out/'normalized.mp4')
for kind in ['video','audio']:
 aa=[p for p in a if p['codec_type']==kind];cc=[p for p in c if p['codec_type']==kind]
 assert [(p['data_hash'],p['pts'],p['dts'],p['duration']) for p in aa]==[(p['data_hash'],p['pts'],p['dts'],p['duration']) for p in cc]
for kind,fmt in [('v','rawvideo'),('a','f32le')]:
 def decode(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:'+kind+':0','-f',fmt,'-'])
 assert decode(out/'normalized.mp4')==decode('results/full-completion/continuity/red.mp4')
moofs=[(p,n) for p,n,t in boxes(0,len(b)) if t=='moof'];groups=[]
for i in [0,2]:
 start=moofs[i][0];end=moofs[i+2][0] if i+2<len(moofs) else next((p for p,n,t in boxes(0,len(b)) if t=='mfra'),len(b));pk=[p for p in c if start<=int(p['pos'])<end];groups.append({'offset':start,'size':end-start,'start':min(float(p['dts_time']) for p in pk),'end':max(float(p['pts_time'])+float(p['duration_time']) for p in pk)})
for i,g in enumerate(groups):g['duration']=(groups[i+1]['start'] if i+1<len(groups) else g['end'])-g['start']
(out/'normalization.json').write_text(json.dumps({'patches':patches,'groups':groups,'codedPacketsTimestampsDurationsExact':True,'hostPixelsPCMExact':True},indent=2)+'\n')

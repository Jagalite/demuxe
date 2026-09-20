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
# The final AAC packet lost its original768-sample duration during capture.
# Expand the final audio trun to explicit durations; adjust containing sizes and all moof-relative data offsets.
moof=[x for x in boxes(0,len(b)) if x[2]=='moof'][-1];mp,mn,_=moof
trafs=[x for x in boxes(mp+8,mp+mn) if x[2]=='traf'];target=None;offsets=[]
for tp,tn,_ in trafs:
 child=list(boxes(tp+8,tp+tn));h=next(x[0] for x in child if x[2]=='tfhd');track=int.from_bytes(b[h+12:h+16],'big')
 for rp,rn,rt in child:
  if rt=='trun':
   flags=int.from_bytes(b[rp+8:rp+12],'big')&0xffffff
   if flags&1:offsets.append(rp+16)
   if track==2:target=(tp,tn,rp,rn,flags)
tp,tn,rp,rn,flags=target;assert flags==0x201
count=int.from_bytes(b[rp+12:rp+16],'big');assert count==51
entries=b''.join((768 if i==count-1 else 1024).to_bytes(4,'big')+b[rp+20+i*4:rp+24+i*4] for i in range(count));extra=count*4
for pos in offsets:b[pos:pos+4]=(int.from_bytes(b[pos:pos+4],'big')+extra).to_bytes(4,'big')
b[rp+8:rp+12]=(0x301).to_bytes(4,'big');b[rp:rp+4]=(rn+extra).to_bytes(4,'big');b[tp:tp+4]=(tn+extra).to_bytes(4,'big');b[mp:mp+4]=(mn+extra).to_bytes(4,'big');b[rp+20:rp+rn]=entries
patches.append({'operation':'restore final AAC sample duration768; expand final trun to explicit durations','added_bytes':extra,'original_duration':1024,'correct_duration':768})
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

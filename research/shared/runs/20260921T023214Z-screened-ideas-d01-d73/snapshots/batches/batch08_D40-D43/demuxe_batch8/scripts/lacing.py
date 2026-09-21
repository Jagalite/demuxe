"""D41. Order matters: unlace first, restore the stripped prefix to EVERY codec frame."""
from common import *
from ogg import read,op

def vint(n,width=None):
 if n<0:raise ValueError('negative VINT')
 if width is None:
  width=next((w for w in range(1,9) if n<(1<<(7*w))-1),None)
 if width is None or n>=(1<<(7*width))-1:raise ValueError('VINT range')
 return ((1<<(7*width))|n).to_bytes(width,'big')
def el(i,b):return i.to_bytes((i.bit_length()+7)//8,'big')+vint(len(b))+b
def uint(i,n):return el(i,n.to_bytes(max(1,(n.bit_length()+7)//8),'big'))
def sint(i,n):
 w=next(w for w in range(1,9) if -(1<<(8*w-1))<=n<(1<<(8*w-1)))
 return el(i,n.to_bytes(w,'big',signed=True))
def getv(b,p,keep=False):
 if p>=len(b) or b[p]==0:raise ValueError('bad VINT')
 w=1
 while not b[p]&(1<<(8-w)):w+=1
 if w>8 or p+w>len(b):raise ValueError('truncated VINT')
 n=int.from_bytes(b[p:p+w],'big');return (n if keep else n&((1<<(7*w))-1)),p+w,w
def elements(b):
 p=0;out=[]
 while p<len(b):
  i,p,_=getv(b,p,True);n,p,w=getv(b,p)
  if n==(1<<(7*w))-1 or p+n>len(b):raise ValueError('unknown/unbounded element')
  out.append((i,b[p:p+n]));p+=n
 return out

def singleton(b,i,default=None):
 a=[v for k,v in elements(b) if k==i]
 if not a and default is not None:return default
 if len(a)!=1:raise ValueError('required unique element '+hex(i))
 return a[0]
def readint(b,i,default=None):
 x=singleton(b,i,default);return int.from_bytes(x,'big')

def lace(packets,mode):
 if mode=='none':
  if len(packets)!=1:raise ValueError('one frame required')
  return 0,packets[0]
 if not 2<=len(packets)<=16:raise ValueError('lace count cap')
 h=bytes([len(packets)-1]);sizes=list(map(len,packets))
 if mode=='xiph':
  for z in sizes[:-1]:h+=b'\xff'*(z//255)+bytes([z%255])
  flags=2
 elif mode=='ebml':
  h+=vint(sizes[0])
  for a,b in zip(sizes[:-2],sizes[1:-1]):
   d=b-a;w=next(w for w in range(1,9) if -((1<<(7*w-1))-1)<=d<(1<<(7*w-1))-1)
   h+=vint(d+(1<<(7*w-1))-1,w)
  flags=6
 else:raise ValueError('lace mode')
 return flags,h+b''.join(packets)

def unlace(data,flags):
 mode=(flags>>1)&3
 if mode==0:return [data]
 if not data:raise ValueError('missing lace count')
 count=data[0]+1;p=1;sizes=[]
 if not 2<=count<=16:raise ValueError('lace count bound')
 if mode==1:
  for _ in range(count-1):
   z=0
   while True:
    if p>=len(data):raise ValueError('truncated Xiph length')
    x=data[p];p+=1;z+=x
    if z>65536:raise ValueError('lace size cap')
    if x<255:break
   sizes.append(z)
 elif mode==3:
  z,p,w=getv(data,p);sizes.append(z)
  for _ in range(count-2):
   v,p,w=getv(data,p);z=sizes[-1]+v-((1<<(7*w-1))-1);sizes.append(z)
 elif mode==2:
  if (len(data)-p)%count:raise ValueError('fixed lace divisibility')
  sizes=[(len(data)-p)//count]*(count-1)
 sizes.append(len(data)-p-sum(sizes))
 if any(not 0<z<=65536 for z in sizes):raise ValueError('lace frame bound')
 out=[]
 for z in sizes:out.append(data[p:p+z]);p+=z
 if p!=len(data):raise ValueError('lace size mismatch')
 return out

def mux(head,packets,end,mode='none',strip=False,prefix=None,wrong_first_only=False,safe_tail=True):
 if head[9]!=2 or head[18]!=0:raise ValueError('stereo Opus scope')
 pre=int.from_bytes(head[10:12],'little');tail=len(packets)*960-end
 prefix=bytes([packets[0][0]]) if prefix is None else prefix
 if strip and any(not p.startswith(prefix) for p in packets):raise ValueError('nonshared prefix')
 ebml=el(0x1A45DFA3,uint(0x4286,1)+uint(0x42F7,1)+uint(0x42F2,4)+uint(0x42F3,8)+el(0x4282,b'matroska' if strip else b'webm')+uint(0x4287,4)+uint(0x4285,2))
 info=el(0x1549A966,uint(0x2AD7B1,1000)+el(0x4D80,b'Demuxe-D41-screen')+el(0x5741,b'Demuxe-D41-screen')+el(0x4489,struct.pack('>d',(end-pre)*1e6/48000)))
 track=uint(0xD7,1)+uint(0x73C5,1)+uint(0x83,2)+uint(0x9C,1)+el(0x86,b'A_OPUS')+el(0x63A2,head)+uint(0x23E383,20000000)+uint(0x56AA,pre*1000000000//48000)+uint(0x56BB,80000000)+el(0xE1,el(0xB5,struct.pack('>d',48000))+uint(0x9F,2))
 if strip:track+=el(0x6D80,el(0x6240,uint(0x5031,0)+uint(0x5032,1)+uint(0x5033,0)+el(0x5034,uint(0x4254,3)+el(0x4255,prefix))))
 tracks=el(0x1654AE6B,el(0xAE,track));clusters=[];group=1 if mode=='none' else 4
 parts=[];i=0
 while i<len(packets):
  take=min(group,len(packets)-i)
  if safe_tail and take>1 and i+take==len(packets):take-=1
  parts.append((i,take));i+=take
 for i,take in parts:
  pp=packets[i:i+take];use=mode if len(pp)>1 else 'none';pp=[p[len(prefix):] for p in pp] if strip else pp
  if wrong_first_only:pp=[p if j==0 else p[1:]for j,p in enumerate(pp)]
  flags,data=lace(pp,use);block=vint(1)+struct.pack('>h',0)+bytes([0x80|flags])+data
  body=uint(0xE7,i*20000)
  if i+len(pp)==len(packets):body+=el(0xA0,el(0xA1,block[:3]+bytes([flags])+block[4:])+uint(0x9B,len(pp)*20000)+sint(0x75A2,tail*1000000000//48000))
  else:body+=el(0xA3,block)
  clusters.append(el(0x1F43B675,body))
 return ebml+el(0x18538067,info+tracks+b''.join(clusters))

def recover(b,expected_source=None):
 if len(b)>2000000:raise ValueError('input cap')
 if expected_source is not None and sha(b)!=expected_source:raise ValueError('source identity')
 segment=singleton(b,0x18538067);track=singleton(singleton(segment,0x1654AE6B),0xAE)
 if readint(track,0xD7)!=1 or singleton(track,0x86)!=b'A_OPUS':raise ValueError('selected track scope')
 if readint(track,0x23E383)!=20000000:raise ValueError('fixed packet duration scope')
 head=singleton(track,0x63A2);ce=singleton(singleton(track,0x6D80),0x6240)
 if readint(ce,0x5031,b'\0')!=0 or readint(ce,0x5032,b'\1')!=1 or readint(ce,0x5033,b'\0')!=0:raise ValueError('unqualified encoding order/scope/type')
 comp=singleton(ce,0x5034)
 if readint(comp,0x4254)!=3:raise ValueError('only header stripping')
 prefix=singleton(comp,0x4255)
 if not 1<=len(prefix)<=16:raise ValueError('prefix cap')
 if readint(singleton(segment,0x1549A966),0x2AD7B1)!=1000:raise ValueError('timestamp scale')
 packets=[];pts=[];discard=0;groups=[]
 for i,cl in elements(segment):
  if i!=0x1F43B675:continue
  stamp=readint(cl,0xE7);blocks=[]
  for k,v in elements(cl):
   if k==0xA3:blocks.append((v,0))
   elif k==0xA0:
    pad=singleton(v,0x75A2,b'\0');blocks.append((singleton(v,0xA1),int.from_bytes(pad,'big',signed=True)))
  for bl,pad in blocks:
   number,p,_=getv(bl,0)
   if number!=1 or p+3>len(bl):raise ValueError('block header')
   offset=int.from_bytes(bl[p:p+2],'big',signed=True);flags=bl[p+2];pp=unlace(bl[p+3:],flags);start=stamp+offset
   if start!=len(packets)*20000 or discard:raise ValueError('continuity/tail scope')
   out=[prefix+x for x in pp]
   if any(op.opus_packet_get_nb_samples(x,len(x),48000)!=960 or (x[0]&3)!=0 or not x[0]&4 for x in out):raise ValueError('restored packet profile')
   groups.append(len(out));packets+=out;pts.extend(start+j*20000 for j in range(len(out)));discard=pad
 if discard<0 or discard*48000%1000000000:raise ValueError('end trim')
 end=len(packets)*960-discard*48000//1000000000
 return head,packets,end,{'group_counts':groups,'packet_times_microseconds':pts,'discard_ns':discard}

if __name__=='__main__':
 ps,end=read((F/'front_pair.opus').read_bytes());h=ps[0];packets=ps[2:];baseline=ff('-c:a','libopus','-i',F/'front_pair.opus','-f','f32le','-')
 o={'packets':len(packets),'shared_prefix_hex':bytes([packets[0][0]]).hex(),'final_granule':end,'variants':{}}
 for mode in ['xiph','ebml']:
  src=mux(h,packets,end,mode,True);plain=mux(h,packets,end,mode,False);(F/('stripped_'+mode+'.mka')).write_bytes(src);(F/('plain_'+mode+'.webm')).write_bytes(plain)
  hh,pp,e,rec=recover(src,sha(src));out=mux(hh,pp,e);(F/('recovered_'+mode+'.webm')).write_bytes(out)
  hostsrc=ff('-c:a','libopus','-i',F/('stripped_'+mode+'.mka'),'-f','f32le','-');hostout=ff('-c:a','libopus','-i',F/('recovered_'+mode+'.webm'),'-f','f32le','-')
  o['variants'][mode]={'source_bytes':len(src),'output_bytes':len(out),'plain_laced_bytes':len(plain),'packets_exact':pp==packets,'head_exact':hh==h,'end_exact':e==end,'host_source_exact':hostsrc==baseline,'host_output_exact':hostout==baseline,'host_source_frames':len(hostsrc)//8,'host_output_frames':len(hostout)//8,'record':rec}
 wrong=[p if i%4==0 else p[1:]for i,p in enumerate(packets)]
 (F/'wrong_restore.webm').write_bytes(mux(h,wrong,end,'none'))
 badtail=mux(h,packets,end,'xiph',True,safe_tail=False);(F/'laced_tail.mka').write_bytes(badtail)
 decoded=ff('-c:a','libopus','-i',F/'laced_tail.mka','-f','f32le','-')
 o['laced_tail_boundary']={'expected_frames':len(baseline)//8,'host_frames':len(decoded)//8,'missing_frames':(len(baseline)-len(decoded))//8,'host_exact':decoded==baseline,'note':'Source-defined end padding belongs once to block; FFprobe exposes it on each of four packets. Bounded main fixture instead leaves padded packet unlaced.'}
 pk=json.loads(run(['ffprobe','-v','error','-show_packets','-of','json',F/'laced_tail.mka']));save('laced_tail_packets.json',pk)
 badsrc=(F/'stripped_xiph.mka').read_bytes();idx=badsrc.index(bytes.fromhex('42548103'));badalgo=badsrc[:idx+3]+b'\x00'+badsrc[idx+4:]
 o['controls']={'truncation':reject(lambda:recover(badsrc[:-5])),'wrong_source':reject(lambda:recover(badsrc,'00'*32)),'other_algorithm':reject(lambda:recover(badalgo)),'oversized_lace_count':reject(lambda:unlace(b'\xffx',2)),'overrun_lace':reject(lambda:unlace(b'\x02\xff\xff\x01x',2))}
 save('lacing_component.json',o);print(json.dumps({k:v if k!='variants' else{kk:{x:y for x,y in vv.items() if x!='record'}for kk,vv in v.items()} for k,v in o.items()},indent=2))

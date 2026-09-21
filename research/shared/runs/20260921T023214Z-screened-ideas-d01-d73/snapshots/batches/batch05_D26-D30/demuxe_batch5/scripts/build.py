from common import *
import numpy as np

# Small BMFF parser: rejects zero/large/invalid box lengths in this isolated profile.
def boxes(b,start=0,end=None):
 end=len(b) if end is None else end
 while start<end:
  if end-start<8: raise ValueError('short box')
  n,t=struct.unpack_from('>I4s',b,start)
  if n<8 or start+n>end:raise ValueError('bad box size')
  yield start,n,t
  start+=n

def path(b,types):
 nodes=[(0,len(b),None)]
 for typ in types:
  new=[]
  for s,n,k in nodes:
   off=s+(0 if k is None else 16 if k==b'stsd' else 86 if k in (b'avc1',b'avc3') else 8)
   new += [x for x in boxes(b,off,s+n) if x[2]==typ]
  nodes=new
 return nodes

def box(t,p):return struct.pack('>I4s',len(p)+8,t)+p

def crc_ogg(b):return crc(b,32,0x04c11db7)

def pages(b):
 pos=0
 while pos<len(b):
  if b[pos:pos+4]!=b'OggS' or pos+27>len(b):raise ValueError('bad Ogg page')
  n=b[pos+26]; h=27+n
  if pos+h>len(b):raise ValueError('short lace')
  size=h+sum(b[pos+27:pos+h])
  page=b[pos:pos+size]
  if len(page)!=size:raise ValueError('short Ogg')
  chk=int.from_bytes(page[22:26],'little');z=bytearray(page);z[22:26]=b'\0'*4
  if crc_ogg(z)!=chk:raise ValueError('CRC')
  yield page,h
  pos+=size

def opus_map(b,mapping):
 if mapping not in ([0,0],[0,255],[255,0]):raise ValueError('explicit dual/silent contract only')
 p=list(pages(b));first,h=p[0];head=first[h:]
 if h!=28 or len(head)!=19 or head[:10]!=b'OpusHead\x01\x01' or head[18]!=0:raise ValueError('mono v1 mapping0 only')
 new=bytearray(head);new[9]=2;new[18]=1;new+=bytes([1,0,*mapping])
 q=bytearray(first[:27]);q[26]=1;q+=bytes([len(new)])+new;q[22:26]=b'\0'*4;q[22:26]=crc_ogg(q).to_bytes(4,'little')
 return bytes(q)+b''.join(x[0] for x in p[1:])

def probe(n):
 p=json.loads(run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',F/n]));save(n+'.probe.json',p);return p

def raw(n,kind='audio'):
 if kind=='audio':return ff('-i',F/n,'-vn','-c:a','pcm_f32le','-f','f32le','-')
 return ff('-i',F/n,'-an','-pix_fmt','yuv420p','-f','rawvideo','-')

def split_frag(b):
 top=list(boxes(b));first=next(s for s,n,t in top if t==b'moof');chunks=[]
 for i,(s,n,t) in enumerate(top):
  if t==b'moof':
   j=i+1
   while j<len(top) and top[j][2]!=b'moof':j+=1
   end=top[j][0] if j<len(top) else len(b)
   # Exclude trailing index; authored files omit it.
   chunks.append(b[s:end])
 return b[:first],chunks

def rewrite_time(fragment,ticks):
 b=bytearray(fragment)
 for s,n,t in path(b,[b'moof',b'traf',b'tfdt']):
  width=8 if b[s+8] else 4;b[s+12:s+12+width]=ticks.to_bytes(width,'big')
 return bytes(b)

if __name__=='__main__':
 info={}
 # D26: mono signal with non-integral duration, varying envelope and audible markers.
 ff('-f','lavfi','-i','aevalsrc=0.21*sin(2*PI*(330+100*t)*t)*(0.5+0.5*sin(2*PI*3*t)):s=48000:d=2.137', '-c:a','libopus','-b:a','64000',F/'mono.opus')
 src=(F/'mono.opus').read_bytes();ref=np.frombuffer(raw('mono.opus'),dtype='<f4');r={}
 for name,mapping in [('dual',[0,0]),('left',[0,255]),('right',[255,0])]:
  out=opus_map(src,mapping);(F/(name+'.opus')).write_bytes(out)
  decoded=np.frombuffer(raw(name+'.opus'),dtype='<f4').reshape(-1,2)
  expect=np.stack([ref if x==0 else np.zeros_like(ref) for x in mapping],axis=1)
  r[name]={'bytes':len(out),'host_frames':len(decoded),'host_mismatches':int(np.count_nonzero(decoded!=expect)), 'media_pages_unchanged':b''.join(x[0] for x in list(pages(src))[1:])==b''.join(x[0] for x in list(pages(out))[1:])}
 r['invalid_mapping']=reject(lambda:opus_map(src,[0,1]));r['truncated']=reject(lambda:opus_map(src[:-1],[0,0]));bad=bytearray(src);bad[-20]^=1;r['corrupt_page']=reject(lambda:opus_map(bytes(bad),[0,0]));r['source_bytes']=len(src);r['source_frames']=len(ref)
 for name in ['mono','dual','left','right']:probe(name+'.opus')
 info['D26']=r
 # D27 and D28: independently encoded 1.5-second intervals, same profile/frame rate/time base,
 # explicit color, IDR and repeat SPS/PPS at every GOP.
 codec=None;manifest={'intervals':[]}
 for i,(w,h) in enumerate([(160,96),(192,112),(160,96)]):
  ff('-f','lavfi','-i',f'testsrc2=size={w}x{h}:rate=20:duration=1.5','-vf',f'drawbox=x={8+i*13}:y=11:w=11:h=17:color=white:t=fill','-an','-c:v','libx264','-preset','ultrafast','-threads','1','-pix_fmt','yuv420p','-profile:v','baseline','-level:v','3.0','-x264-params','keyint=10:min-keyint=10:scenecut=0:repeat-headers=1','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-tag:v','avc3','-video_track_timescale','1000','-movflags','empty_moov+frag_keyframe+default_base_moof+skip_trailer',F/f'epoch{i}.mp4')
  b=(F/f'epoch{i}.mp4').read_bytes();init,frags=split_frag(b);(F/f'init{i}.mp4').write_bytes(init)
  avcc=path(b,[b'moov',b'trak',b'mdia',b'minf',b'stbl',b'stsd',b'avc3',b'avcC'])[0][0];codec='avc3.'+b[avcc+9:avcc+12].hex()
  arr=[]
  for j,f in enumerate(frags):
   f=rewrite_time(f,i*1500+j*500);name=f'epoch{i}_frag{j}.m4s';(F/name).write_bytes(f);arr.append(name)
  manifest['intervals'].append({'init':f'init{i}.mp4','fragments':arr,'start':i*1.5,'size':[w,h],'file':f'epoch{i}.mp4'})
 manifest['codec']=codec
 joined=(F/'init0.mp4').read_bytes()+b''.join((F/n).read_bytes() for e in manifest['intervals'] for n in e['fragments']);(F/'all_epochs.mp4').write_bytes(joined)
 # Missing-in-band negative: replace SPS/PPS bytes with nonessential filler NAL units,
 # preserving lengths, offsets, VCL bytes, and packet sizes.
 neg=bytearray(joined);changed=0
 for s,n,t in boxes(neg):
  if t!=b'mdat':continue
  p=s+8
  while p<s+n:
   length=int.from_bytes(neg[p:p+4],'big');p+=4
   if length<=0 or p+length>s+n:raise ValueError('NAL boundary')
   if (neg[p]&31) in (7,8):neg[p:p+length]=bytes([12])+b'\xff'*(length-2)+b'\x80';changed+=1
   p+=length
 (F/'no_inband.mp4').write_bytes(neg)
 manifest['no_inband_replacements']=changed
 # D29: clean aperture vs known crop encoded in SPS. All VCL remains original.
 base=(F/'epoch0.mp4').read_bytes();s,n,t=path(base,[b'moov',b'trak',b'mdia',b'minf',b'stbl',b'stsd',b'avc3'])[0]
 aperture=box(b'clap',struct.pack('>IIIIiIiI',144,1,80,1,0,1,0,1))
 insert=s+n;b=bytearray(base[:insert]+aperture+base[insert:]);
 parents=[b'moov',b'trak',b'mdia',b'minf',b'stbl',b'stsd',b'avc3']
 for k in range(1,len(parents)+1):
  x,sz,_=path(base,parents[:k])[0];b[x:x+4]=(sz+len(aperture)).to_bytes(4,'big')
 (F/'clean_aperture.mp4').write_bytes(b)
 ff('-i',F/'epoch0.mp4','-map','0:v:0','-c:v','copy','-bsf:v','h264_metadata=crop_left=8:crop_right=8:crop_top=8:crop_bottom=8','-tag:v','avc3','-video_track_timescale','1000','-movflags','empty_moov+frag_keyframe+default_base_moof+skip_trailer',F/'sps_crop.mp4')
 for n in ['epoch0.mp4','epoch1.mp4','epoch2.mp4','all_epochs.mp4','no_inband.mp4','clean_aperture.mp4','sps_crop.mp4']:probe(n)
 # D30: three GOPs with B-picture reordering, known 25Hz timestamps.
 ff('-f','lavfi','-i','testsrc2=size=160x96:rate=25:duration=3','-an','-c:v','libx264','-preset','medium','-threads','1','-pix_fmt','yuv420p','-x264-params','keyint=25:min-keyint=25:scenecut=0:bframes=3','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-video_track_timescale','1000','-movflags','empty_moov+frag_keyframe+default_base_moof+negative_cts_offsets+skip_trailer',F/'bframes.mp4')
 probe('bframes.mp4')
 save('component_initial.json',info);save('manifest.json',manifest)
 print(json.dumps(info,indent=2));print(codec)

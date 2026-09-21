"""D44-D46 bounded MP4/configuration experiments. SPDX-License-Identifier: MIT."""
from common import *
import numpy as np
CONTAINERS={'moov','trak','mdia','minf','stbl','mvex','moof','traf'}
def rewrite(b, f):
 out=[]
 for q in boxes(b):
  t=q['type'];v=payload(b,q);n=f(t,v)
  if n is None:n=rewrite(v,f) if t in CONTAINERS else v
  out.append(box(t,n))
 return b''.join(out)
def entry(init):
 q=find(init,'moov/trak/mdia/minf/stbl/stsd');v=payload(init,q)
 assert u32(v,4)==1
 return v[8:]
def getcodec(init):
 q=init.index(b'avcC');return 'avc1.'+init[q+5:q+8].hex()
def split(b):
 top=boxes(b);ix=[i for i,q in enumerate(top) if q['type']=='moof'];assert ix
 init=b[:top[ix[0]]['start']];frags=[]
 for i in ix:
  assert top[i+1]['type']=='mdat';frags.append(b[top[i]['start']:top[i+1]['end']])
 return init,frags

def set_description(frag,idx,ticks=None,seq=None):
 if not 1<=idx<=2:raise ValueError('sample description index outside declared table')
 oldq=find(frag,'moof/traf/tfhd');oldv=payload(frag,oldq);flags=int.from_bytes(oldv[1:4],'big')
 assert not flags&1 and not flags&2 # bounded original profile no base offset or desc index
 def edit(t,v):
  if t=='tfhd':return v[:1]+(flags|2).to_bytes(3,'big')+v[4:8]+p32(idx)+v[8:]
  if t=='trun':
   fl=int.from_bytes(v[1:4],'big');assert fl&1
   return v[:8]+struct.pack('>i',struct.unpack_from('>i',v,8)[0]+4)+v[12:]
  if t=='tfdt' and ticks is not None:
   return v[:4]+ticks.to_bytes(8 if v[0]==1 else 4,'big')
  if t=='mfhd' and seq is not None:return v[:4]+p32(seq)
  return None
 return rewrite(frag,edit)
def project_fragment(frag,known_entries):
 q=find(frag,'moof/traf/tfhd');v=payload(frag,q);fl=int.from_bytes(v[1:4],'big')
 if fl&1 or not fl&2:raise ValueError('unqualified tfhd addressing')
 idx=u32(v,8)
 if not 1<=idx<=len(known_entries):raise ValueError('unknown description')
 def edit(t,v):
  if t=='tfhd':return v[:8]+p32(1)+v[12:]
  return None
 return idx,rewrite(frag,edit)
def ff(*a):return run(['ffmpeg','-hide_banner','-loglevel','error','-y',*a])
def encode(name,size='160x96',extra=(),dur='1',spsid=0,refresh=False):
 params=f'keyint=20:min-keyint=20:scenecut=0:bframes=0:sps-id={spsid}:open-gop=0:colorprim=bt709:transfer=bt709:colormatrix=bt709'
 if refresh:params+=':intra-refresh=1:ref=1'
 ff('-f','lavfi','-i',f'testsrc2=size={size}:rate=20:duration={dur}','-an','-c:v','libx264','-threads','1','-preset','medium','-crf','20','-x264-params',params,'-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv',*extra,'-movflags','+frag_keyframe+empty_moov+default_base_moof+write_colr','-video_track_timescale','20000','-write_btrt','0',F/name)
 v=bytearray((F/name).read_bytes());z=v.index(b'colr');v[z+8:z+14]=p16(1)*3;v[z+14]=0;(F/name).write_bytes(v)

def sampledescriptions():
 encode('desc_a.mp4');encode('desc_b.mp4','240x144',spsid=1)
 a,af=split((F/'desc_a.mp4').read_bytes());b,bf=split((F/'desc_b.mp4').read_bytes());assert len(af)==len(bf)==1
 ae,be=entry(a),entry(b)
 def stsd(t,v):return v[:4]+p32(2)+ae+be if t=='stsd' else None
 init=rewrite(a,stsd);(F/'desc_multi.init').write_bytes(init);(F/'desc_a.init').write_bytes(a);(F/'desc_b.init').write_bytes(b)
 fs=[set_description(af[0],1,0,1),set_description(bf[0],2,20000,2),set_description(af[0],1,40000,3)]
 jobs=[];metadata=[]
 for i,f in enumerate(fs):
  n=f'desc{i}.m4s';(F/n).write_bytes(f);idx,out=project_fragment(f,[ae,be]);name=f'desc_project{i}.m4s';(F/name).write_bytes(out)
  assert raw(f,find(f,'mdat'))==raw(out,find(out,'mdat'))
  jobs.append({'source':n,'projected':name,'entry':idx,'init':'desc_a.init' if idx==1 else 'desc_b.init'})
  metadata.append({'entry':idx,'bytes':len(f),'candidate_changed_byte_values':sum(x!=y for x,y in zip(f,out)),'mdat_hash':sha(raw(f,find(f,'mdat')))})
 fullfile=init+b''.join(fs);(F/'desc_multi.mp4').write_bytes(fullfile)
 p=probe('desc_multi.mp4');pa=probe('desc_a.mp4');pb=probe('desc_b.mp4');ref=pa['packets']+pb['packets']+pa['packets']
 unknown=bytearray(fs[1]);q=find(unknown,'moof/traf/tfhd');unknown[q['payload']+8:q['payload']+12]=p32(3);(F/'desc_unknown.m4s').write_bytes(unknown)
 try:project_fragment(bytes(unknown),[ae,be]);reject=False
 except ValueError:reject=True
 o={'codec':getcodec(a),'entries':[sha(ae),sha(be)],'jobs':jobs,'fragments':metadata,'packet_count':len(p['packets']),'payloads_equal_reference':[z['data_hash'] for z in p['packets']]==[z['data_hash'] for z in ref],'unknown_index_rejected':reject,'times':[.125,.525,.925,1.125,1.525,1.925,2.125,2.525,2.925,1.225,.225,2.225]}
 save('description_manifest.json',o)

# AVC SEI recovery messages: parse framing, payload sizes and Exp-Golomb counter.
def rbsp(b):
 out=bytearray();zeros=0
 for v in b:
  if zeros>=2 and v==3:zeros=0;continue
  out.append(v);zeros=zeros+1 if v==0 else 0
 return bytes(out)
def recovery(nal):
 if nal[0]&31!=6:return []
 b=rbsp(nal[1:]);p=0;o=[]
 while p<len(b) and b[p]!=0x80:
  typ=0
  while p<len(b) and b[p]==255:typ+=255;p+=1
  if p>=len(b):raise ValueError('SEI truncated type')
  typ+=b[p];p+=1;size=0
  while p<len(b) and b[p]==255:size+=255;p+=1
  if p>=len(b):raise ValueError('SEI truncated size')
  size+=b[p];p+=1
  if p+size>len(b):raise ValueError('SEI outside NAL')
  v=b[p:p+size];p+=size
  if typ==6:
   bits=''.join(f'{x:08b}' for x in v);z=len(bits)-len(bits.lstrip('0'))
   if 2*z+1+4>len(bits):raise ValueError('recovery bits')
   cnt=int(bits[z:2*z+1],2)-1;idx=2*z+1;o.append({'recovery_frame_cnt':cnt,'exact_match':int(bits[idx]),'broken_link':int(bits[idx+1])})
 return o

def refresh():
 encode('refresh.mp4',dur='5',refresh=True)
 b=(F/'refresh.mp4').read_bytes();init,fs=split(b);(F/'refresh.init').write_bytes(init);p=probe('refresh.mp4');out=[]
 for j,f in enumerate(fs):
  n=f'refresh{j}.m4s';(F/n).write_bytes(f);(F/f'refresh_only{j}.mp4').write_bytes(init+f)
  pp=probe(f'refresh_only{j}.mp4')['packets'];sample=(init+f)[int(pp[0]['pos']):int(pp[0]['pos'])+int(pp[0]['size'])];x=0;msgs=[];types=[]
  while x<len(sample):
   size=u32(sample,x);x+=4;v=sample[x:x+size];x+=size;assert len(v)==size
   types.append(v[0]&31);msgs+=recovery(v)
  out.append({'file':n,'packets':len(pp),'first_pts':pp[0].get('pts_time'),'first_flags':pp[0]['flags'],'nal_types':types,'recovery_messages':msgs,'fragment_sha256':sha(f)})
 full=ff('-i',F/'refresh.mp4','-f','rawvideo','-pix_fmt','yuv420p','-');framebytes=160*96*3//2
 host=[]
 for j in [1,3]:
  r=run(['ffmpeg','-v','error','-flags2','+showall','-i',F/f'refresh_only{j}.mp4','-f','rawvideo','-pix_fmt','yuv420p','-'],check=False)
  equal=[r[i*framebytes:(i+1)*framebytes]==full[(j*20+i)*framebytes:(j*20+i+1)*framebytes] for i in range(len(r)//framebytes)]
  host.append({'fragment':j,'decoded_frames':len(r)//framebytes,'frame_equal_full':equal})
 save('refresh_manifest.json',{'codec':getcodec(init),'fragments':out,'host':host,'full_frames':len(full)//framebytes})

def colors():
 # Same coded source, metadata-only bitstream edits produce alternate SPS declarations.
 encode('color709.mp4',dur='2')
 for stem,bsf in [('color601','h264_metadata=colour_primaries=6:transfer_characteristics=6:matrix_coefficients=6'),('colorfull','h264_metadata=video_full_range_flag=1')]:
  ff('-i',F/'color709.mp4','-an','-c:v','copy','-bsf:v',bsf,'-movflags','+frag_keyframe+empty_moov+default_base_moof+write_colr','-write_btrt','0',F/f'{stem}_temp.mp4')
  original=(F/f'{stem}_temp.mp4').read_bytes();v=bytearray(original);p=v.index(b'colr')
  if stem=='color601':v[p+8:p+14]=p16(6)*3;v[p+14]=0
  else:v[p+8:p+14]=p16(1)*3;v[p+14]=128
  (F/f'{stem}.mp4').write_bytes(v)
 cases={}
 for name,source,container in [('sps709_colr601','color709',6),('sps601_colr709','color601',1),('sps709_colrfull','color709',0),('spsfull_colr709','colorfull',1)]:
  v=bytearray((F/f'{source}.mp4').read_bytes());p=v.index(b'colr');v[p+8:p+14]=p16(container or 1)*3;v[p+14]=128 if container==0 else 0
  (F/f'{name}.mp4').write_bytes(v)
 for name in ['color709','color601','colorfull','sps709_colr601','sps601_colr709','sps709_colrfull','spsfull_colr709']:
  data=(F/f'{name}.mp4').read_bytes();init,fs=split(data);(F/f'{name}.init').write_bytes(init)
  frag=[]
  for i,x in enumerate(fs):n=f'{name}_{i}.m4s';(F/n).write_bytes(x);frag.append(n)
  p=probe(name+'.mp4');rawout=ff('-i',F/f'{name}.mp4','-f','rawvideo','-pix_fmt','yuv420p','-')
  cases[name]={'codec':getcodec(init),'init':name+'.init','fragments':frag,'packet_hashes':[z['data_hash'] for z in p['packets']],'raw_yuv_sha256':sha(rawout),'raw_yuv_bytes':len(rawout),'source_fields':{k:p['streams'][0].get(k)for k in ['color_range','color_space','color_transfer','color_primaries']}}
 save('color_manifest.json',cases)
if __name__=='__main__':
 sampledescriptions();refresh();colors()
 print('video fixtures built')

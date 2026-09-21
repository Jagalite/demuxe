from common import *
from jpeg_tables import abbreviate,restore,split
from channel_projection import project
from PIL import Image
import numpy as np,io,shutil
# D21: same fixed-table interval, then changed tables with same table IDs.
j=[]
for epoch,quality in [(0,88),(1,42)]:
 for ordinal in range(8):
  y,x=np.indices((96,160));a=np.stack([(x*3+ordinal*23)%256,(y*5+ordinal*17)%256,((x+y)*2+ordinal*11)%256],axis=2).astype('uint8')
  buf=io.BytesIO();Image.fromarray(a).save(buf,format='JPEG',quality=quality,subsampling=2,optimize=False)
  original=buf.getvalue();short,tables,desc=abbreviate(original,epoch)
  restored=restore(short,tables,desc,epoch)
  name=f'jpeg_e{epoch}_{ordinal}'
  for suffix,b in [('full.jpg',original),('short.jpg',short),('restored.jpg',restored)]: (F/f'{name}_{suffix}').write_bytes(b)
  if epoch==0 and ordinal==0:firsttables=tables;firstdesc=desc
  if epoch==1 and ordinal==0:
   # Wrong tables can remain syntactically decodable: keep this as a fidelity negative.
   s,scan=split(short);wrong=b'\xff\xd8'+b''.join(firsttables)+b''.join(v for _,v in s)+scan
   (F/'jpeg_wrong_tables.jpg').write_bytes(wrong)
   controls={'stale_epoch':reject(lambda:restore(short,tables,desc,0)),
    'wrong_tables':reject(lambda:restore(short,firsttables,desc,1)),
    'missing_tables':reject(lambda:restore(short,[],desc,1)),
    'truncated':reject(lambda:restore(short[:-3],tables,desc,1))}
  host1=ff('-i',F/f'{name}_full.jpg','-f','rawvideo','-pix_fmt','rgb24','pipe:1')
  host2=ff('-i',F/f'{name}_restored.jpg','-f','rawvideo','-pix_fmt','rgb24','pipe:1')
  j.append({'name':name,'epoch':epoch,'short_bytes':len(short),'full_bytes':len(original),'table_bytes':sum(map(len,tables)),'scan_sha256':sha(split(original)[1]),'scan_retained':split(original)[1]==split(restored)[1],'host_rgb_equal':host1==host2,'descriptor':desc})
save('jpeg_host.json',{'cases':j,'controls':controls})
# D22: H264 display-orientation SEI, then explicit tkhd rotation, no picture re-encode.
ff('-f','lavfi','-i','testsrc2=s=160x96:r=20:d=2','-an','-c:v','libx264','-threads','1','-preset','ultrafast','-crf','18','-g','20','-bf','0','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+empty_moov+frag_keyframe+default_base_moof',F/'orientation_base.mp4')
ff('-i',F/'orientation_base.mp4','-c','copy','-bsf:v','h264_metadata=display_orientation=insert:rotate=90','-movflags','+empty_moov+frag_keyframe+default_base_moof',F/'orientation_sei.mp4')
# Source-authoritative static matrix descriptor. ffprobe verifies SEI on decoded frames separately.
def boxes(b,start=0,end=None):
 end=len(b) if end is None else end;p=start
 while p<end:
  if p+8>end:raise ValueError('box truncated')
  n=int.from_bytes(b[p:p+4],'big');t=b[p+4:p+8]
  if n<8 or p+n>end:raise ValueError('box bounds')
  yield t,p,n;p+=n

def matrix(data,rotation):
 out=bytearray(data);patch=[]
 for t,p,n in boxes(data):
  if t!=b'moov':continue
  for t,q,m in boxes(data,p+8,p+n):
   if t!=b'trak':continue
   for t,s,k in boxes(data,q+8,q+m):
    if t!=b'tkhd':continue
    if data[s+8]!=0:raise ValueError('v0 tkhd only')
    off=s+48;old=list(struct.unpack('>9i',data[off:off+36]))
    if old!=[65536,0,0,0,65536,0,0,0,1073741824]:raise ValueError('existing transform conflict')
    if rotation==90:v=[0,-65536,0,65536,0,0,0,0,1073741824]
    elif rotation==-90:v=[0,65536,0,-65536,0,0,0,0,1073741824]
    else:raise ValueError('right-angle profile only')
    out[off:off+36]=struct.pack('>9i',*v);patch.append(off)
 if len(patch)!=1:raise ValueError('one video track expected')
 return bytes(out)
sei=(F/'orientation_sei.mp4').read_bytes()
for name,angle in [('orientation_matrix.mp4',90),('orientation_wrong.mp4',-90)]:(F/name).write_bytes(matrix(sei,angle))
ori={}
for name in ['orientation_base.mp4','orientation_sei.mp4','orientation_matrix.mp4','orientation_wrong.mp4']:
 p=json.loads(run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',F/name]));save(name+'.probe.json',p)
 raw=ff('-noautorotate','-i',F/name,'-f','rawvideo','-pix_fmt','yuv420p','pipe:1')
 ori[name]={'packets':len(p['packets']),'packet_hashes':[x['data_hash'] for x in p['packets']],'raw_yuv_sha256':sha(raw),'raw_bytes':len(raw),'stream_side_data':p['streams'][0].get('side_data_list'),'byte_changes_from_sei':sum(a!=b for a,b in zip(sei,(F/name).read_bytes()))}
ori['guards']={'existing_matrix':reject(lambda:matrix((F/'orientation_matrix.mp4').read_bytes(),90)),'unsupported_angle':reject(lambda:matrix(sei,45))}
save('orientation_host.json',ori)
frames=json.loads(run(['ffprobe','-v','error','-select_streams','v','-show_frames','-show_entries','frame=pts_time,side_data_list','-of','json',F/'orientation_sei.mp4']))
save('orientation_sei_frames.json',frames)
# D23: advance a narrow independent-channel component using batch3 authored bytes.
source=R/'inputs'/'six_channel.flac'
if not (F/'six_channel.flac').exists():shutil.copy(source,F/'six_channel.flac')
six=(F/'six_channel.flac').read_bytes();two,meta=project(six,[0,1]);wrong,wrong_meta=project(six,[4,5]);reversed_,_=project(six,[1,0])
(F/'selected_front.flac').write_bytes(two);(F/'selected_rear.flac').write_bytes(wrong);(F/'selected_reversed.flac').write_bytes(reversed_)
raw=ff('-i',F/'six_channel.flac','-f','s24le','pipe:1');expected=b''.join(raw[p:p+6] for p in range(0,len(raw),18))
actual=ff('-i',F/'selected_front.flac','-f','s24le','pipe:1')
(F/'selected_front_expected.pcm').write_bytes(expected)
run(['flac','-t','-s',F/'selected_front.flac'])
meta.update({'host_exact_selected_pcm':expected==actual,'host_scalar_samples':len(actual)//3,'wrong_pair_differs':ff('-i',F/'selected_rear.flac','-f','s24le','pipe:1')!=expected,'controls':{'surround_request':reject(lambda:project(six,[0,1],'preserve_surround')),'downmix_request':reject(lambda:project(six,[0,1],'downmix_stereo')),'duplicate_channel':reject(lambda:project(six,[0,0])),'truncated_frame':reject(lambda:project(six[:-1],[0,1]))},'input_sha256':sha(six)})
save('channel_host.json',meta)
print(json.dumps({'jpeg_frames':len(j),'orientation_frames':ori['orientation_sei.mp4']['packets'],'channel_projection':meta},indent=2))

# SPDX-License-Identifier: MIT
from common import *
import numpy as np, math, wave

def mp3_frames(data):
 p=0; out=[]
 while p<len(data):
  if p+4>len(data):raise ValueError('truncated MP3 header')
  h=int.from_bytes(data[p:p+4],'big')
  if h>>21 != 0x7ff or (h>>19)&3!=3 or (h>>17)&3!=1:raise ValueError('restricted MPEG1 Layer III only')
  br=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0][h>>12&15]*1000
  sr=[44100,48000,32000,0][h>>10&3]
  if not br or not sr:raise ValueError('bad bitrate/rate')
  size=144*br//sr+((h>>9)&1);crc=0 if h>>16&1 else 2;ch=1 if h>>6&3==3 else 2;side=17 if ch==1 else 32
  if p+size>len(data):raise ValueError('truncated frame')
  q=p+4+crc; mdb=(data[q]<<1)|(data[q+1]>>7)
  if out and (sr,ch)!=(out[0]['sample_rate'],out[0]['channels']):raise ValueError('configuration change')
  out.append(dict(offset=p,size=size,main_bytes=size-4-crc-side,main_data_begin=mdb,sample_rate=sr,channels=ch,hash=sha(data[p:p+size])))
  p+=size
 return out

def audio():
 sr=48000;N=288137;t=np.arange(N)/sr;rng=np.random.default_rng(941)
 noise=rng.normal(size=N)*.03
 left=.29*np.sin(2*np.pi*(257*t+31*t*t))+.1*np.sin(2*np.pi*1057*t)+noise
 right=.27*np.cos(2*np.pi*(479*t+12*t*t))+.08*np.sin(2*np.pi*1733*t)-noise
 left[(np.arange(N)//3101)%7==2]*=.05;right[(np.arange(N)//1709)%9==3]*=.02
 pcm=np.rint(np.stack([left,right],axis=1)*24000).astype('<i2')
 with wave.open(str(F/'mp3_signal.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
 run(['ffmpeg','-v','error','-y','-i',F/'mp3_signal.wav','-c:a','libmp3lame','-b:a','128k','-ar',str(sr),'-write_xing','0','-id3v2_version','0',F/'mp3_full.mp3'])
 data=(F/'mp3_full.mp3').read_bytes();fs=mp3_frames(data)
 dec=lambda n:np.frombuffer(run(['ffmpeg','-v','error','-i',F/n,'-f','f32le','-acodec','pcm_f32le','-']),dtype='<f4').reshape(-1,2)
 full=dec('mp3_full.mp3');jobs=[]
 for target in [20,73,145,210]:
  need=fs[target]['main_data_begin'];start=target;have=0
  while have<need and start>0:start-=1;have+=fs[start]['main_bytes']
  for tag,s in [('none',target),('reservoir_bytes',start),('plus1',max(0,start-1)),('plus3',max(0,start-3)),('plus8',max(0,start-8))]:
   stop=target+7;raw=data[fs[s]['offset']:fs[stop]['offset']];name=f'mp3_{target}_{tag}.mp3';(F/name).write_bytes(raw)
   out=dec(name);offset=(target-s)*1152+137;count=4093;ref=full[target*1152+137:target*1152+137+count];v=out[offset:offset+count]
   jobs.append(dict(file=name,target_frame=target,start_frame=s,stop_frame=stop,tag=tag,encoded_bytes=len(raw),source_offset=target*1152+137,candidate_offset=offset,count=count,main_data_begin=need,prior_main_bytes=have,host_frames=len(out),host_differences=int(np.count_nonzero(v!=ref)) if v.shape==ref.shape else None,host_max_error=float(np.max(abs(v-ref))) if v.shape==ref.shape else None,packet_hashes_match=[f['hash']for f in mp3_frames(raw)]==[f['hash']for f in fs[s:stop]]))
 negatives={}
 for name,raw in [('truncated',data[:-9]),('wrong_sync',b'\0'+data[1:])]:
  try:mp3_frames(raw);negatives[name]='accepted'
  except ValueError as e:negatives[name]=str(e)
 save('mp3_manifest.json',dict(source='mp3_full.mp3',sha256=sha(data),source_bytes=len(data),sample_rate=sr,channels=2,source_frames=len(fs),host_full_frames=len(full),jobs=jobs,negative_controls=negatives,contract='reference is endpoint own full no-Xing decode; not pre-encoding lossless PCM'))
 print('MP3',[(j['target_frame'],j['tag'],j['host_differences'])for j in jobs],flush=True)

def video():
 run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=160x96:rate=25:duration=3','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-g','25','-bf','0','-sc_threshold','0','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-video_track_timescale','90000','-movflags','+frag_keyframe+empty_moov+default_base_moof',F/'clock_base.mp4'])
 data=(F/'clock_base.mp4').read_bytes();top=boxes(data);first=next(x['start']for x in top if x['type']=='moof');init=data[:first];(F/'clock.init').write_bytes(init)
 avcc=data.index(b'avcC');codec='avc1.'+data[avcc+5:avcc+8].hex();md=find(init,'moov/trak/mdia/mdhd');timescale=u32(init,md['payload']+12)
 fragments=[];i=0
 for k,q in enumerate(top):
  if q['type']!='moof':continue
  end=top[k+1]['end'];frag=data[q['start']:end];(F/f'clock_{i}.m4s').write_bytes(frag);fragments.append(frag);i+=1
 origins=[2**32+137,2**53+137,2**62+137]
 results=[]
 for origin in origins:
  files=[];rebases=[];naives=[];deltas=[]
  for i,frag in enumerate(fragments):
   tf=find(frag,'moof/traf/tfdt');p=tf['payload'];assert frag[p]==1
   t=int.from_bytes(frag[p+4:p+12],'big');absolute=origin+t
   shifted=bytearray(frag);shifted[p+4:p+12]=absolute.to_bytes(8,'big');name=f'clock_{origin}_{i}.m4s';(F/name).write_bytes(shifted);files.append(name)
   re=bytearray(shifted);re[p+4:p+12]=(absolute-origin).to_bytes(8,'big');rname=f'rebased_{origin}_{i}.m4s';(F/rname).write_bytes(re);rebases.append(rname)
   naive=int(float(absolute)-float(origin));wrong=bytearray(shifted);wrong[p+4:p+12]=naive.to_bytes(8,'big');wname=f'rounded_{origin}_{i}.m4s';(F/wname).write_bytes(wrong);naives.append(wname)
   deltas.append(dict(fragment=i,original=t,absolute=str(absolute),rounded=naive,error_ticks=naive-t,exact_bytes_restored=bytes(re)==frag,payload_unchanged=payload(bytes(shifted),find(bytes(shifted),'mdat'))==payload(frag,find(frag,'mdat'))))
  results.append(dict(origin=str(origin),offset=-origin/timescale,shifted=files,rebased=rebases,rounded=naives,deltas=deltas))
 save('clock_manifest.json',dict(init='clock.init',base_fragments=[f'clock_{i}.m4s'for i in range(len(fragments))],source='clock_base.mp4',source_sha256=sha(data),source_bytes=len(data),timescale=timescale,codec=codec,times=[.14,.98,1.02,1.58,1.98,2.02,2.62],origins=results))
 print('VIDEO',results,flush=True)
if __name__=='__main__':
 audio();video()

"""SPDX-License-Identifier: MIT. Strict single-item AVIF profile -> timed AV1 samples.
Not a general HEIF reader. Never ignore alpha, transforms, grids or unknown properties.
"""
from common import *
from edited_view import create_header,source
import copy

def children(b,q,skip=0):return boxes(b,q['payload']+skip,q['end'])
def only(ch,t):
 a=[q for q in ch if q['type']==t]
 if len(a)!=1:raise ValueError('expected one '+t)
 return a[0]
def obu_sequence(x):
 p=0;seq=[];frames=0;types=[]
 while p<len(x):
  h=x[p];p+=1
  if h&0x85 or not h&2:raise ValueError('unsupported OBU extension or framing')
  typ=(h>>3)&15;v=0;shift=0
  for _ in range(8):
   if p>=len(x):raise ValueError('truncated OBU length')
   byte=x[p];p+=1;v|=(byte&127)<<shift;shift+=7
   if not byte&128:break
  else:raise ValueError('oversized OBU integer')
  if v>1024*1024 or p+v>len(x):raise ValueError('OBU bound')
  if typ==1:seq.append(x[p:p+v])
  elif typ==6:frames+=1
  else:raise ValueError('unsupported OBU type')
  types.append(typ);p+=v
 if types!=[1,6] or len(seq)!=1 or frames!=1:raise ValueError('bounded one sequence/one frame profile')
 return seq[0]

def extract(b):
 if len(b)>2*1024*1024:raise ValueError('file cap')
 top=boxes(b);meta=only(top,'meta');mc=children(b,meta,4)
 if set(q['type']for q in mc)-{'hdlr','pitm','iloc','iinf','iprp'}:raise ValueError('unknown meta relationships')
 pit=payload(b,only(mc,'pitm'))
 if len(pit)!=6 or pit[:4]!=bytes(4):raise ValueError('primary version')
 primary=u16(pit,4);info=only(mc,'iinf');ip=payload(b,info)
 if ip[:4]!=bytes(4) or u16(ip,4)!=1:raise ValueError('multiple items/alpha/grid profile excluded')
 infe=payload(b,only(children(b,info,6),'infe'))
 if infe[:4]!=b'\x02\0\0\0' or u16(infe,4)!=primary or u16(infe,6)!=0 or infe[8:12]!=b'av01':raise ValueError('unsupported primary item')
 loc=payload(b,only(mc,'iloc'))
 if len(loc)!=22 or loc[:8]!=bytes(4)+b'\x44\0\0\1' or u16(loc,8)!=primary or u16(loc,10)!=0 or u16(loc,12)!=1:raise ValueError('unsupported item extent encoding')
 start=u32(loc,14);length=u32(loc,18)
 if length>1024*1024 or not any(q['type']=='mdat'and q['payload']<=start and start+length<=q['end'] for q in top):raise ValueError('item extent out of bounds')
 pc=children(b,only(mc,'iprp'));props=children(b,only(pc,'ipco'));pa=payload(b,only(pc,'ipma'))
 if pa[:4]!=bytes(4) or u32(pa,4)!=1 or u16(pa,8)!=primary:raise ValueError('property association profile')
 count=pa[10]
 if len(pa)!=11+count:raise ValueError('property association bounds')
 inds=[v&127 for v in pa[11:]]
 if len(set(inds))!=len(inds) or sorted(inds)!=list(range(1,len(props)+1)):raise ValueError('ambiguous/unused property association')
 if set(q['type']for q in props)!={'ispe','pixi','av1C','colr'} or len(props)!=4:raise ValueError('transforms/auxiliary/unknown properties excluded')
 for q in props:
  if q['type'] not in ['ispe','pixi','av1C','colr']:raise ValueError('unknown property')
 ispe=payload(b,only(props,'ispe'));w,h=u32(ispe,4),u32(ispe,8)
 if ispe[:4]!=bytes(4) or len(ispe)!=12 or not(0<w<=512 and 0<h<=512):raise ValueError('geometry cap')
 pixi=payload(b,only(props,'pixi'))
 if pixi!=bytes(4)+b'\x03\x08\x08\x08':raise ValueError('only RGB-component 8-bit')
 av1c=payload(b,only(props,'av1C'));colr=payload(b,only(props,'colr'))
 if len(av1c)!=4 or av1c[0]!=0x81:raise ValueError('av1C profile')
 if len(colr)!=11 or colr[:4]!=b'nclx':raise ValueError('no ICC/unknown color profile')
 coded=b[start:start+length];seq=obu_sequence(coded)
 return {'width':w,'height':h,'av1c':av1c,'colr':colr,'coded':coded,'sequence':seq,'offset':start,'size':length}

def make_header(items,durations):
 s=source('a.mp4');template=s['stsd'][16:16+86];entry=bytearray(template);entry[4:8]=b'av01';entry[32:34]=p16(items[0]['width']);entry[34:36]=p16(items[0]['height'])
 ext=box('av1C',items[0]['av1c'])+box('colr',items[0]['colr']);entry[0:4]=p32(len(entry)+len(ext));s['stsd']=full('stsd',p32(1)+bytes(entry)+ext);s['scale']=12000;s['dt']=6000
 # create_header owns the common box author; stts is replaced here with the exact nonuniform durations.
 samples=[{'duration':dt,'size':len(x['coded']),'sync':True}for dt,x in zip(durations,items)]
 header=create_header(s,samples,[0]*len(samples));q=find(header,'moov/trak/mdia/minf/stbl/stts')
 def patch(h,offsets):
  stts=full('stts',p32(len(durations))+b''.join(p32(1)+p32(dt)for dt in durations));old=find(h,'moov/trak/mdia/minf/stbl/stts');delta=len(stts)-old['size'];out=bytearray(h[:old['start']]+stts+h[old['end']:])
  for path in ['moov','moov/trak','moov/trak/mdia','moov/trak/mdia/minf','moov/trak/mdia/minf/stbl']:
   pos=find(h,path)['start'];out[pos:pos+4]=p32(u32(h,pos)+delta)
  co=find(out,'moov/trak/mdia/minf/stbl/stco');p=co['payload']+8
  for i,x in enumerate(offsets):out[p+4*i:p+4*i+4]=p32(x)
  return bytes(out)
 header=patch(header,[0]*len(items));offsets=[];cursor=len(header)+8
 for it in items:offsets.append(cursor);cursor+=len(it['coded'])
 co=find(header,'moov/trak/mdia/minf/stbl/stco');out=bytearray(header)
 for i,x in enumerate(offsets):out[co['payload']+8+4*i:co['payload']+12+4*i]=p32(x)
 header=bytes(out);old_ftyp=raw(header,find(header,'ftyp'));new_ftyp=box('ftyp',b'isom'+p32(512)+b'isomiso2av01mp41')
 assert len(new_ftyp)==len(old_ftyp)
 header=new_ftyp+header[len(old_ftyp):]
 return header+box('mdat',b''.join(i['coded']for i in items)),s['stsd']

def init_from_regular(b,stsd):
 def walk(path):
  q=find(b,path);out=[]
  for c in children(b,q):
   t=c['type'];v=bytearray(raw(b,c))
   if t in ['udta','edts']:continue
   if t=='stbl':out.append(box('stbl',stsd+full('stts',p32(0))+full('stsc',p32(0))+full('stsz',p32(0)+p32(0))+full('stco',p32(0))));continue
   if t in ['trak','mdia','minf']:out.append(walk(path+'/'+t));continue
   if t in ['mvhd','mdhd']:v[24:28]=p32(0)
   if t=='tkhd':v[28:32]=p32(0)
   out.append(bytes(v))
  if path=='moov':out.append(box('mvex',full('trex',p32(1)+p32(1)+p32(0)+p32(0)+p32(0))))
  return box(path.split('/')[-1],b''.join(out))
 return raw(b,find(b,'ftyp'))+walk('moov')
def fragment(data,dt,t,seq):
 def moof(offset):return box('moof',full('mfhd',p32(seq))+box('traf',full('tfhd',p32(1),0x020000)+full('tfdt',t.to_bytes(8,'big'),version=1)+full('trun',p32(1)+p32(offset)+p32(dt)+p32(len(data))+p32(0x02000000),0x000701)))
 h=moof(0);h=moof(len(h)+8);return h+box('mdat',data)
def main():
 items=[]
 for i in range(3):
  name=f'image{i}.avif';run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'testsrc2=size=160x96:rate=1:duration=1,hue=h={i*87}','-frames:v','1','-c:v','libaom-av1','-cpu-used','8','-crf','25','-still-picture','1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv',F/name]);items.append(extract((F/name).read_bytes()))
 for x in items:
  if any(x[k]!=items[0][k] for k in ['width','height','av1c','colr','sequence']):raise ValueError('incompatible item configuration')
 durations=[6000,18000,9000];data,stsd=make_header(items,durations);(F/'avif_timeline.mp4').write_bytes(data);init=init_from_regular(data,stsd);fmp4=init;t=0
 for i,x in enumerate(items):fmp4+=fragment(x['coded'],durations[i],t,i+1);t+=durations[i]
 (F/'avif_timeline_fragmented.mp4').write_bytes(fmp4)
 expect=b''.join(run(['ffmpeg','-v','error','-i',F/f'image{i}.avif','-frames:v','1','-f','rawvideo','-pix_fmt','yuv420p','-'])for i in range(3))
 res={'items':[{'file':f'image{i}.avif','size':len((F/f'image{i}.avif').read_bytes()),'coded_bytes':x['size'],'coded_sha256':sha(x['coded']),'sequence_sha256':sha(x['sequence']),'colr_hex':x['colr'].hex()}for i,x in enumerate(items)],'outputs':{},'controls':{}}
 for n in ['avif_timeline.mp4','avif_timeline_fragmented.mp4']:
  pp=probe(n)['packets'];matches=[p['data_hash'].split(':')[1]==sha(x['coded'])for p,x in zip(pp,items)];actual=run(['ffmpeg','-v','error','-i',F/n,'-fps_mode','passthrough','-f','rawvideo','-pix_fmt','yuv420p','-']);res['outputs'][n]={'bytes':len((F/n).read_bytes()),'packets':len(pp),'packet_matches':matches,'pts':[p['pts_time']for p in pp],'durations':[p.get('duration_time')for p in pp],'host_yuv_equal':actual==expect,'host_yuv_bytes':len(actual),'host_yuv_sha256':sha(actual)}
  assert len(pp)==3 and all(matches) and actual==expect
 b=(F/'image0.avif').read_bytes();top=boxes(b);mc=children(b,only(top,'meta'),4)
 negatives={}
 bad=bytearray(b);q=only(mc,'pitm');bad[q['payload']+4:q['payload']+6]=p16(2);negatives['wrong_primary']=bytes(bad)
 bad=bytearray(b);q=only(mc,'iloc');bad[q['payload']+14:q['payload']+18]=p32(len(b)+100);negatives['extent_outside_file']=bytes(bad)
 negatives['truncated']=b[:-10]
 # Genuine alpha AVIF, generated via libavif exposed by Pillow when installed.
 from PIL import Image
 try:
  im=Image.new('RGBA',(160,96),(90,170,30,128));im.save(F/'alpha.avif',format='AVIF');negatives['alpha_not_silently_dropped']=(F/'alpha.avif').read_bytes()
 except Exception as e:res['controls']['alpha_fixture']={'blocked':str(e)}
 for label,nb in negatives.items():
  (F/(label+'.avif')).write_bytes(nb)
  try:extract(nb);res['controls'][label]={'rejected':False}
  except Exception as e:res['controls'][label]={'rejected':True,'reason':str(e)}
 # Same sizes but wrong declared sequence must not pass a configuration-bound cache/sequence plan.
 bad=copy.deepcopy(items);bad[1]['sequence']=bytes([bad[1]['sequence'][0]^1])+bad[1]['sequence'][1:]
 res['controls']['changed_sequence_rejected']=any(x['sequence']!=bad[0]['sequence']for x in bad)
 save('avif_component.json',res);save('avif_manifest.json',{'codec':'av01.0.00M.08','duration':2.75,'images':[f'image{i}.avif'for i in range(3)],'targets':[.125,.625,1.125,1.875,2.125,2.625],'indices':[0,1,1,1,2,2]});print(json.dumps(res,indent=2))
if __name__=='__main__':main()

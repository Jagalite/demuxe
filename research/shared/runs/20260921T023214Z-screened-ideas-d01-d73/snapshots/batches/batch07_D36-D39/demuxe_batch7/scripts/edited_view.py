"""SPDX-License-Identifier: MIT. Single AVC track, no CTTS, no edits, closed-GOP bounded author."""
from common import *
import random,copy

def source(name):
 b=(F/name).read_bytes();stbl=find(b,'moov/trak/mdia/minf/stbl');ch={q['type']:q for q in boxes(b,stbl['payload'],stbl['end'])}
 if set(ch)-{'stsd','stts','stss','stsc','stsz','stco'}:raise ValueError('unsupported sample tables '+str(set(ch)))
 ed=[q for q in boxes(b,find(b,'moov/trak')['payload'],find(b,'moov/trak')['end']) if q['type']=='edts']
 if ed:
  e=payload(b,find(b,'moov/trak/edts/elst'))
  if e[0]!=0 or u32(e,4)!=1 or u32(e,12)!=0 or e[16:20]!=b'\0\1\0\0':raise ValueError('unsupported source edit')
 sd=payload(b,ch['stsd'])
 if u32(sd,4)!=1 or sd[12:16]!=b'avc1':raise ValueError('only one avc1 sample description')
 stsd=raw(b,ch['stsd']);avcc=stsd.index(b'avcC');nal_width=(stsd[avcc+8]&3)+1
 if nal_width!=4:raise ValueError('only four-byte AVC NAL lengths')
 sz=payload(b,ch['stsz']);n=u32(sz,8)
 if n>10000:raise ValueError('sample index cap')
 sizes=([u32(sz,4)]*n if u32(sz,4) else [u32(sz,12+4*i) for i in range(n)])
 ts=payload(b,ch['stts']);dur=[]
 for i in range(u32(ts,4)):
  cnt=u32(ts,8+8*i);dt=u32(ts,12+8*i)
  if dt<=0 or len(dur)+cnt>n:raise ValueError('invalid duration')
  dur.extend([dt]*cnt)
 if len(dur)!=n or len(set(dur))!=1:raise ValueError('bounded constant cadence only')
 co=payload(b,ch['stco']);offsets=[u32(co,8+4*i) for i in range(u32(co,4))]
 sc=payload(b,ch['stsc']);maps=[tuple(u32(sc,8+12*i+j*4) for j in range(3)) for i in range(u32(sc,4))]
 if not maps or maps[0][0]!=1 or any(x[2]!=1 for x in maps):raise ValueError('sample-description switch')
 keys=set(range(1,n+1))
 if 'stss'in ch:
  ss=payload(b,ch['stss']);keys={u32(ss,8+4*i) for i in range(u32(ss,4))}
 mdat=[q for q in boxes(b) if q['type']=='mdat'];out=[];ordinal=0;dts=0
 for i,start in enumerate(offsets,1):
  applicable=[m for m in maps if m[0]<=i];count=applicable[-1][1];pos=start
  for j in range(count):
   if ordinal>=n:raise ValueError('too many chunk samples')
   z=sizes[ordinal]
   if not any(q['payload']<=pos and pos+z<=q['end'] for q in mdat):raise ValueError('sample outside media')
   vcl=b[pos:pos+z];np=0;has_idr=False
   while np<len(vcl):
    if np+4>len(vcl):raise ValueError('truncated NAL length')
    nz=u32(vcl,np);np+=4
    if not nz or np+nz>len(vcl):raise ValueError('NAL bound')
    if vcl[np]&31==5:has_idr=True
    np+=nz
   out.append({'source':name,'start':pos,'size':z,'idr':has_idr,'duration':dur[ordinal],'dts':dts,'sync':ordinal+1 in keys,'hash':sha(b[pos:pos+z])});pos+=z;dts+=dur[ordinal];ordinal+=1
 if ordinal!=n:raise ValueError('wrong sample count')
 md=payload(b,find(b,'moov/trak/mdia/mdhd'))
 if md[0]:raise ValueError('unsupported time header')
 scale=u32(md,12)
 # Independent demux comparison, not used to construct candidate sample tables.
 pr=probe(name);pk=pr['packets']
 if len(pk)!=len(out):raise AssertionError('independent packet count')
 for x,y in zip(out,pk):
  assert x['start']==int(y['pos']) and x['size']==int(y['size']) and x['dts']==int(y['dts']) and x['dts']==int(y['pts']) and x['duration']==int(y['duration'])
  assert y['data_hash'].split(':')[1]==x['hash'] and ('K' in y['flags'])==x['sync']
 return {'name':name,'data':b,'sha':sha(b),'stsd':stsd,'scale':scale,'samples':out,'dt':dur[0]}

def create_header(src,samples,positions):
 b=src['data'];dur=sum(x['duration'] for x in samples);scale=src['scale'];n=len(samples)
 stbl=box('stbl',src['stsd']+full('stts',p32(1)+p32(n)+p32(src['dt']))+full('stss',p32(sum(x['sync'] for x in samples))+b''.join(p32(i+1) for i,x in enumerate(samples) if x['sync']))+full('stsc',p32(1)+p32(1)+p32(1)+p32(1))+full('stsz',p32(0)+p32(n)+b''.join(p32(x['size']) for x in samples))+full('stco',p32(n)+b''.join(p32(p) for p in positions)))
 def rebuild(path):
  q=find(b,path);typ=path.split('/')[-1];out=[]
  for child in boxes(b,q['payload'],q['end']):
   t=child['type'];v=bytearray(raw(b,child))
   if t in ['edts','udta']:continue
   if t=='stbl':out.append(stbl);continue
   if t in ['trak','mdia','minf']:out.append(rebuild(path+'/'+t));continue
   if t in ['mvhd','mdhd','tkhd']:
    if v[8]!=0:raise ValueError('v1 timing excluded')
    if t=='mvhd':v[20:24]=p32(scale);v[24:28]=p32(dur)
    elif t=='mdhd':v[20:24]=p32(scale);v[24:28]=p32(dur)
    else:v[28:32]=p32(dur)
   out.append(bytes(v))
  return box(typ,b''.join(out))
 return raw(b,find(b,'ftyp'))+rebuild('moov')

def compile_view(sources,requests,deduplicate=False):
 samples=[]
 for name,start,end in requests:
  s=sources[name]
  if not 0<=start<end<=len(s['samples']):raise ValueError('bad sample interval')
  if not s['samples'][start]['sync'] or not s['samples'][start]['idr']:raise ValueError('start needs declared sync plus AVC IDR')
  if end<len(s['samples']) and (not s['samples'][end]['sync'] or not s['samples'][end]['idr']):raise ValueError('end must be a GOP boundary')
  if s['stsd']!=next(iter(sources.values()))['stsd'] or s['scale']!=next(iter(sources.values()))['scale']:raise ValueError('source configuration mismatch')
  samples+=copy.deepcopy(s['samples'][start:end])
 src=next(iter(sources.values()));header=create_header(src,samples,[0]*len(samples));base=len(header)+8;spans=[];positions=[];seen={};cursor=base
 for x in samples:
  key=(x['source'],x['start'],x['size'])
  if deduplicate and key in seen:positions.append(seen[key]);continue
  positions.append(cursor);seen[key]=cursor;spans.append({'file':x['source'],'start':x['start'],'end':x['start']+x['size'],'output':cursor});cursor+=x['size']
 header=create_header(src,samples,positions)+p32(cursor-base+8)+b'mdat'
 assert len(header)==base
 return header,spans,samples,positions

def range_read(header,spans,sources,start,end):
 total=(spans[-1]['output']+spans[-1]['end']-spans[-1]['start']) if spans else len(header)
 if not 0<=start<=end<=total:raise ValueError('range bounds')
 for s in sources.values():
  if sha(s['data'])!=s['sha']:raise ValueError('source changed')
 out=[]
 if start<len(header):out.append(header[start:min(end,len(header))])
 for q in spans:
  lo=max(start,q['output']);hi=min(end,q['output']+q['end']-q['start'])
  if hi>lo:out.append(sources[q['file']]['data'][q['start']+lo-q['output']:q['start']+hi-q['output']])
 result=b''.join(out)
 if len(result)!=end-start:raise ValueError('unmapped range')
 return result

def main():
 # Independent authored animation streams: closed GOP, no reordered pictures, explicit color.
 for name,filter in [('a','testsrc2=size=160x96:rate=20:duration=2'),('b','testsrc2=size=160x96:rate=20:duration=2,hue=h=95')]:
  run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',filter,'-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-g','20','-bf','0','-sc_threshold','0','-x264-params','open-gop=0:force-cfr=1','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-video_track_timescale','20000','-movflags','+faststart','-write_btrt','0',F/(name+'.mp4')])
 sources={n:source(n) for n in ['a.mp4','b.mp4']};res={};manifest={'sources':{n:{'sha256':s['sha'],'size':len(s['data'])} for n,s in sources.items()},'views':{},'codec':''}
 x=sources['a.mp4']['stsd'];k=x.index(b'avcC');manifest['codec']='avc1.'+x[k+5:k+8].hex()
 for name,dedup in [('edited',False),('aliased',True)]:
  header,spans,samples,positions=compile_view(sources,[('a.mp4',0,20),('b.mp4',0,20),('a.mp4',0,20)],dedup)
  (F/(name+'.header')).write_bytes(header);material=header+b''.join(sources[q['file']]['data'][q['start']:q['end']] for q in spans);(F/(name+'.mp4')).write_bytes(material)
  man={'header':name+'.header','spans':spans,'total':len(material),'sha256':sha(material),'sample_positions':positions};manifest['views'][name]=man
  pp=probe(name+'.mp4')['packets'];assert len(pp)==60
  for i,(p,s) in enumerate(zip(pp,samples)):
   assert p['data_hash'].split(':')[1]==s['hash'] and int(p['pts'])==i*1000 and int(p['duration'])==1000
  rng=random.Random(20260920);tests=[]
  for _ in range(500):
   lo=rng.randrange(len(material));hi=min(len(material),lo+rng.randrange(1,4097));tests.append((lo,hi))
  for q in spans:
   for v in [q['output'],q['output']+q['end']-q['start']]:tests.append((max(0,v-7),min(len(material),v+7)))
  assert all(range_read(header,spans,sources,lo,hi)==material[lo:hi] for lo,hi in tests)
  # A/B/A independent decode-select-concatenate oracle, not a muxer-authored header.
  rawA=run(['ffmpeg','-v','error','-i',F/'a.mp4','-f','rawvideo','-pix_fmt','yuv420p','-']);rawB=run(['ffmpeg','-v','error','-i',F/'b.mp4','-f','rawvideo','-pix_fmt','yuv420p','-']);framebytes=160*96*3//2
  expected=rawA[:20*framebytes]+rawB[:20*framebytes]+rawA[:20*framebytes]
  got=run(['ffmpeg','-v','error','-i',F/(name+'.mp4'),'-f','rawvideo','-pix_fmt','yuv420p','-']);assert got==expected
  res[name]={'bytes':len(material),'header_bytes':len(header),'coded_payload_bytes':len(material)-len(header),'physical_packet_spans':len(spans),'timeline_samples':len(samples),'random_boundary_ranges_checked':len(tests),'packet_identity_timing_pass':True,'complete_host_yuv_pass':True,'host_yuv_bytes':len(got),'host_yuv_sha256':sha(got),'backward_chunk_offsets':sum(positions[i]<positions[i-1] for i in range(1,len(positions)))}
  # Wrong sample address must not reproduce expected coded bytes.
  wrong=bytearray(material);q=find(material,'moov/trak/mdia/minf/stbl/stco');p=q['payload']+8;wrong[p:p+4]=p32(u32(wrong,p)+1);(F/(name+'_wrong_offset.mp4')).write_bytes(wrong)
  res[name]['wrong_offset_detected']=bytes(wrong[u32(wrong,p):u32(wrong,p)+samples[0]['size']])!=sources['a.mp4']['data'][samples[0]['start']:samples[0]['start']+samples[0]['size']]
 controls={}
 for label,fn in [('non_random_access',lambda:compile_view(sources,[('a.mp4',1,20)])),('non_gop_end',lambda:compile_view(sources,[('a.mp4',0,19)])),('bad_range',lambda:range_read(header,spans,sources,-1,99))]:
  try:fn();controls[label]={'rejected':False}
  except ValueError as e:controls[label]={'rejected':True,'reason':str(e)}
 stale=copy.deepcopy(sources);stale['a.mp4']['data']=b'X'+stale['a.mp4']['data'][1:]
 try:range_read(header,spans,stale,0,100);controls['stale_source']={'rejected':False}
 except ValueError as e:controls['stale_source']={'rejected':True,'reason':str(e)}
 forged=copy.deepcopy(sources);forged['a.mp4']['samples'][1]['sync']=True
 try:compile_view(forged,[('a.mp4',1,20)]);controls['forged_sync_flag']={'rejected':False}
 except ValueError as e:controls['forged_sync_flag']={'rejected':True,'reason':str(e)}
 incompatible=copy.deepcopy(sources);incompatible['b.mp4']['stsd']=b'X'+incompatible['b.mp4']['stsd'][1:]
 try:compile_view(incompatible,[('b.mp4',0,20)]);controls['unequal_configuration_unit_test']={'rejected':False}
 except ValueError as e:controls['unequal_configuration_unit_test']={'rejected':True,'reason':str(e)}
 res['controls']=controls;save('edited_component.json',res);save('manifest.json',manifest);print(json.dumps(res,indent=2))
if __name__=='__main__':main()

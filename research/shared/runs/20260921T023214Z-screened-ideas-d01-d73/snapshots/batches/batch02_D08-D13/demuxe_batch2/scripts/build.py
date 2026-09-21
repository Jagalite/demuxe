"""Bounded fMP4 fixture transformations; NOT a general parser or Demuxe integration."""
from __future__ import annotations
import json,struct,subprocess,hashlib,shutil
from pathlib import Path
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence';F.mkdir(exist_ok=True);E.mkdir(exist_ok=True)
logs=[]
def run(args):
 p=subprocess.run([str(a) for a in args],capture_output=True,timeout=30)
 logs.append({'argv':[str(a) for a in args],'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')})
 (E/'build_commands.json').write_text(json.dumps(logs,indent=2))
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout

def u32(b,p):return int.from_bytes(b[p:p+4],'big')
def box(t,body):return struct.pack('>I',len(body)+8)+t.encode()+body
def boxes(b,start=0,end=None):
 end=len(b) if end is None else end;p=start
 while p<end:
  if p+8>end:raise ValueError('truncated box')
  n=u32(b,p);h=8
  if n==1:
   if p+16>end:raise ValueError('truncated large box')
   n=int.from_bytes(b[p+8:p+16],'big');h=16
  if n==0:n=end-p
  if n<h or p+n>end:raise ValueError('out of bounds')
  yield(b[p+4:p+8].decode('latin1'),p,n,h);p+=n

def child(b,z,t):return next(x for x in boxes(b,z[1]+z[3],z[1]+z[2]) if x[0]==t)
def descriptor(b,p):
 tag=b[p];p+=1;n=0
 for _ in range(4):
  v=b[p];p+=1;n=(n<<7)|(v&127)
  if not v&128:break
 else:raise ValueError('invalid descriptor length')
 if p+n>len(b):raise ValueError('truncated descriptor')
 return tag,p,p+n

def enc(tag,data):
 n=len(data)
 return bytes([tag,128|((n>>21)&127),128|((n>>14)&127),128|((n>>7)&127),n&127])+data

def read_asc(b):
 p=b.index(b'esds')-4;n=u32(b,p);s=b[p:p+n]
 rt,rp,re=descriptor(s,12);assert rt==3 and s[rp+2]==0
 ct,cp,ce=descriptor(s,rp+3);assert ct==4
 at,ap,ae=descriptor(s,cp+13);assert at==5
 return s[ap:ae]

def replace_asc(b,a):
 # Rebuild only the containing moov hierarchy. Fixture uses moof-relative addressing.
 def rec(chunk,typ):
  if typ=='esds':
   rt,rp,re=descriptor(chunk,12);assert rt==3 and chunk[rp+2]==0
   ct,cp,ce=descriptor(chunk,rp+3);assert ct==4
   at,ap,ae=descriptor(chunk,cp+13);assert at==5
   dec=enc(4,chunk[cp:cp+13]+enc(5,a)+chunk[ae:ce])
   root=enc(3,chunk[rp:rp+3]+dec+chunk[ce:re])
   return box('esds',chunk[8:12]+root+chunk[re:])
  offsets={'moov':8,'trak':8,'mdia':8,'minf':8,'stbl':8,'stsd':16,'mp4a':36}
  if typ not in offsets:return chunk
  start=offsets[typ];parts=[chunk[8:start]]
  for t,p,n,h in boxes(chunk,start):parts.append(rec(chunk[p:p+n],t))
  return box(typ,b''.join(parts))
 return b''.join(rec(b[p:p+n],t) for t,p,n,h in boxes(b) if t!='mfra')

RATES=[96000,88200,64000,48000,44100,32000,24000,22050,16000,12000,11025,8000,7350]
def unpack_bits(b):return ''.join(f'{x:08b}' for x in b)
def pack_bits(s):return int(s+'0'*((-len(s))%8),2).to_bytes((len(s)+7)//8,'big')
def explicit_asc(a,rate=None):
 s=unpack_bits(a);i=int(s[5:9],2);assert int(s[:5],2)==2 and i<13
 return pack_bits(s[:5]+'1111'+f'{RATES[i] if rate is None else rate:024b}'+s[9:])
def canonical_asc(a):
 s=unpack_bits(a)
 if len(s)<40 or int(s[:5],2)!=2 or s[5:9]!='1111':raise ValueError('not qualified explicit AAC-LC')
 rate=int(s[9:33],2)
 if rate not in RATES:raise ValueError('rate has no exact table representation')
 if s[33:37]!='0010' or s[37:40]!='000':raise ValueError('not stereo AAC-LC 1024/no-dependency/no-extension')
 # This scoped profile permits only a known absent-SBR sync extension or padding after GA config.
 rest=s[40:]
 if rest not in ('','0'*len(rest)) and rest!='010101101110010100000000':raise ValueError('unqualified trailing configuration')
 return pack_bits(s[:5]+f'{RATES.index(rate):04b}'+s[33:])

# Reuse self-authored packet essence from batch 1, generate new A/V control.
run(['ffmpeg','-y','-v','error','-i',F/'reference_video.mp4','-f','lavfi','-i','aevalsrc=0.12*sin(2*PI*997*t)|0.09*sin(2*PI*1481*t):s=48000:d=4','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','128k','-threads','1','-movflags','+empty_moov+frag_keyframe+default_base_moof',F/'control.mp4'])
base=(F/'control.mp4').read_bytes();base=b''.join(base[p:p+n] for t,p,n,h in boxes(base) if t!='mfra');(F/'control.mp4').write_bytes(base)
a=read_asc(base);ea=explicit_asc(a);print('ASC',a.hex(),ea.hex(),flush=True)
ca=canonical_asc(ea);assert ca==a
explicit=replace_asc(base,ea);(F/'explicit_rate.mp4').write_bytes(explicit)
normalized=replace_asc(explicit,ca);(F/'canonical_rate.mp4').write_bytes(normalized);assert normalized==base
negative_asc=explicit_asc(a,48001)
try:canonical_asc(negative_asc);negative_rate=False
except ValueError:negative_rate=True
trunc=[]
for n in range(5):
 try:canonical_asc(ea[:n]);trunc.append(False)
 except ValueError:trunc.append(True)

# Generate an equivalent absolute-addressed fMP4 using the host muxer.
run(['ffmpeg','-y','-v','error','-i',F/'control.mp4','-map','0','-c','copy','-movflags','+empty_moov+frag_keyframe',F/'absolute.mp4'])
ab=(F/'absolute.mp4').read_bytes();ab=b''.join(ab[p:p+n] for t,p,n,h in boxes(ab) if t!='mfra');(F/'absolute.mp4').write_bytes(ab)

def relative_rebase(b):
 out=bytearray(b);records=[]
 for t,p,n,h in boxes(b):
  if t!='moof':continue
  for tr in boxes(b,p+h,p+n):
   if tr[0]!='traf':continue
   th=child(b,tr,'tfhd');hp=th[1];flags=int.from_bytes(b[hp+9:hp+12],'big')
   if not flags&1:raise ValueError('this transformation admits explicit absolute bases only')
   if flags&0x020000:raise ValueError('contradictory base flags')
   baseoff=int.from_bytes(b[hp+16:hp+24],'big')
   fresh=box('tfhd',b[hp+8:hp+9]+((flags&~1)|0x020000).to_bytes(3,'big')+b[hp+12:hp+16]+b[hp+24:hp+th[2]])+box('free',b'')
   assert len(fresh)==th[2];out[hp:hp+th[2]]=fresh
   for ru in boxes(b,tr[1]+tr[3],tr[1]+tr[2]):
    if ru[0]!='trun':continue
    rp=ru[1];rf=int.from_bytes(b[rp+9:rp+12],'big')
    if not rf&1:raise ValueError('explicit trun offsets required in screen')
    old=int.from_bytes(b[rp+16:rp+20],'big',signed=True);new=baseoff+old-p
    if not -(1<<31)<=new<(1<<31):raise ValueError('relative offset overflow')
    if not (p+n+8<=p+new<len(b)):raise ValueError('sample reference outside local media')
    out[rp+16:rp+20]=new.to_bytes(4,'big',signed=True)
    records.append({'moof':p,'track_id':u32(b,hp+12),'old_base':baseoff,'old_offset':old,'new_offset':new,'first_byte_absolute':baseoff+old})
 return bytes(out),records
rel,records=relative_rebase(ab);(F/'relative.mp4').write_bytes(rel)
# Broken witness: one byte shift on first track's data offset.
bad=bytearray(rel);mp=next(x for x in boxes(bad) if x[0]=='moof');tr=child(bad,mp,'traf');ru=child(bad,tr,'trun');off=ru[1]+16;bad[off:off+4]=(u32(bad,off)+1).to_bytes(4,'big');(F/'bad_offset.mp4').write_bytes(bad)

# Decode-time inference from sample durations, not from mfhd sequence number.
def track_defaults(b):
 moov=next(z for z in boxes(b) if z[0]=='moov');mv=child(b,moov,'mvex')
 return {u32(b,p+12):u32(b,p+20) for t,p,n,h in boxes(b,mv[1]+8,mv[1]+mv[2]) if t=='trex'}
def fragments(b):return[z for z in boxes(b) if z[0]=='moof']
def info(b,tr,defaults):
 th=child(b,tr,'tfhd');p=th[1];flags=int.from_bytes(b[p+9:p+12],'big');tid=u32(b,p+12);cur=p+16
 if flags&1:cur+=8
 if flags&2:cur+=4
 dur=u32(b,cur) if flags&8 else defaults[tid]
 total=0;count=0
 for t,r,n,h in boxes(b,tr[1]+8,tr[1]+tr[2]):
  if t!='trun':continue
  fl=int.from_bytes(b[r+9:r+12],'big');cnt=u32(b,r+12);q=r+16+(4 if fl&1 else 0)+(4 if fl&4 else 0)
  for _ in range(cnt):
   d=u32(b,q) if fl&0x100 else dur
   if not d:raise ValueError('unknown/zero sample duration')
   total+=d;count+=1
   q+=sum(4 for flag in [0x100,0x200,0x400,0x800] if fl&flag)
 return tid,total,count

def erase_tfdt(b):
 out=bytearray(b);records=[]
 for ix,m in enumerate(fragments(b)):
  for tr in boxes(b,m[1]+8,m[1]+m[2]):
   if tr[0]!='traf':continue
   tf=child(b,tr,'tfdt')
   if ix>0:
    out[tf[1]+4:tf[1]+8]=b'free';out[tf[1]+8:tf[1]+tf[2]]=b'\xa5'*(tf[2]-8);records.append({'offset':tf[1],'size':tf[2],'hidden_decode_time':int.from_bytes(b[tf[1]+12:tf[1]+tf[2]],'big')})
 return bytes(out),records

def infer_tfdt(b,expected_source_spans=None,known_epoch=True):
 if not known_epoch:raise ValueError('cannot infer without a trusted continuity epoch')
 # The caller must prove sequential, gap-free source spans. mfhd alone is insufficient.
 fs=fragments(b)
 if expected_source_spans is None or [(p,n) for t,p,n,h in fs]!=expected_source_spans:raise ValueError('unproven/gapped/reordered source spans')
 defaults=track_defaults(b);state={};out=bytearray(b);record=[]
 for m in fs:
  for tr in boxes(b,m[1]+8,m[1]+m[2]):
   if tr[0]!='traf':continue
   tid,total,count=info(b,tr,defaults);ch=list(boxes(b,tr[1]+8,tr[1]+tr[2]));tf=next((z for z in ch if z[0]=='tfdt'),None)
   if tf:
    start=int.from_bytes(b[tf[1]+12:tf[1]+tf[2]],'big')
    if tid in state and state[tid]!=start:raise ValueError('unexpected decode-time discontinuity')
   else:
    if tid not in state:raise ValueError('missing predecessor for this track')
    start=state[tid]
    # Known fixture reservation; a production writer would rebuild boxes, never guess at free payloads.
    free=next((z for z in ch if z[0]=='free' and z[2]==20),None)
    if free is None:raise ValueError('no qualified output header reservation')
    fresh=box('tfdt',b'\x01\0\0\0'+start.to_bytes(8,'big'));out[free[1]:free[1]+free[2]]=fresh
    record.append({'track_id':tid,'start':start,'sum_duration':total,'samples':count,'offset':free[1]})
   state[tid]=start+total
 return bytes(out),record
missing,erased=erase_tfdt(base);(F/'missing_tfdt.mp4').write_bytes(missing)
spans=[(p,n) for t,p,n,h in fragments(missing)];rebuilt,inferences=infer_tfdt(missing,spans);(F/'inferred_tfdt.mp4').write_bytes(rebuilt);assert rebuilt==base
negatives={}
for name,kwargs in [('unproven_source',{}),('new_epoch',{'expected_source_spans':spans,'known_epoch':False}),('gap_in_plan',{'expected_source_spans':spans[1:]})]:
 try:infer_tfdt(missing,**kwargs);negatives[name]=False
 except ValueError:negatives[name]=True
# Native direct alternatives and compositional barriers will be screened separately.
# Build combinations from absolute fMP4: rate transform must also adjust every absolute base.
def relocate_absolute_after_init(old,new):
 delta=len(new)-len(old);out=bytearray(new)
 for m in fragments(new):
  for tr in boxes(new,m[1]+8,m[1]+m[2]):
   if tr[0]!='traf':continue
   th=child(new,tr,'tfhd');p=th[1];flags=int.from_bytes(new[p+9:p+12],'big')
   if flags&1:out[p+16:p+24]=(int.from_bytes(new[p+16:p+24],'big')+delta).to_bytes(8,'big')
 return bytes(out)
compound=relocate_absolute_after_init(ab,replace_asc(ab,explicit_asc(read_asc(ab))));compound,_=erase_tfdt(compound);(F/'compound_0.mp4').write_bytes(compound)
for mask in range(1,8):
 v=compound
 if mask&1:
  prev=v;v=replace_asc(v,canonical_asc(read_asc(v)));v=relocate_absolute_after_init(prev,v)
 if mask&2:v,_=relative_rebase(v)
 if mask&4:v,_=infer_tfdt(v,[(p,n) for t,p,n,h in fragments(v)])
 (F/f'compound_{mask}.mp4').write_bytes(v)

# Independent host demux/decode witnesses. Reference host and browser may share FFmpeg ancestry.
def probe(name):
 d=json.loads(run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',F/name]));(E/(name+'.ffprobe.json')).write_text(json.dumps(d,indent=2));return d
def witness(name):
 d=probe(name);b=(F/name).read_bytes();raw=run(['ffmpeg','-v','error','-i',F/name,'-map','0:v','-pix_fmt','yuv420p','-vsync','0','-threads','1','-f','rawvideo','pipe:1']);pcm=run(['ffmpeg','-v','error','-i',F/name,'-map','0:a','-f','f32le','-c:a','pcm_f32le','pipe:1'])
 s=next(s for s in d['streams'] if s['codec_type']=='video');a=next(s for s in d['streams'] if s['codec_type']=='audio');frame_size=s['width']*s['height']*3//2
 packets=[{'stream':p['stream_index'],'pts':p.get('pts'),'dts':p.get('dts'),'duration':p.get('duration'),'hash':p['data_hash'],'size':p['size']} for p in d['packets']]
 timebase=s['time_base'];num,den=map(int,timebase.split('/'));pts=sorted(round(int(p['pts'])*num/den*1e6) for p in d['packets'] if p['stream_index']==s['index'])
 return {'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'packets':packets,'pts_us':pts,'video_frames':len(raw)//frame_size,'video_sha256':hashlib.sha256(raw).hexdigest(),'audio_frames':len(pcm)//(4*a['channels']),'audio_sha256':hashlib.sha256(pcm).hexdigest(),'channels':a['channels'],'codec':'avc1.'+b[b.index(b'avcC')+5:b.index(b'avcC')+8].hex()}
valid=['control.mp4','explicit_rate.mp4','canonical_rate.mp4','absolute.mp4','relative.mp4','inferred_tfdt.mp4','compound_7.mp4']
manifest={}
for name in valid:
 try:manifest[name]=witness(name)
 except RuntimeError as exc:
  if name!='explicit_rate.mp4':raise
  manifest[name]={'host_error':str(exc)}
# Media payload hashes in all variants distinguish metadata changes from essence changes.
for name in [p.name for p in F.glob('*.mp4')]:
 b=(F/name).read_bytes();payload=[hashlib.sha256(b[p+h:p+n]).hexdigest() for t,p,n,h in boxes(b) if t=='mdat'];manifest.setdefault(name,{})['mdat_hashes']=payload
 if 'pts_us' not in manifest[name]:manifest[name]['pts_us']=manifest['control.mp4']['pts_us']
 if 'codec' not in manifest[name]:manifest[name]['codec']=manifest['control.mp4']['codec']
 manifest[name]['moof_hashes']=[hashlib.sha256(b[p:p+n]).hexdigest() for t,p,n,h in boxes(b) if t=='moof']
(E/'manifest.json').write_text(json.dumps(manifest,indent=2));(F/'manifest.json').write_text(json.dumps(manifest))
summary={'aac':{'input_asc':ea.hex(),'output_asc':ca.hex(),'rate_guard_rejected':negative_rate,'truncations_rejected':trunc,'restored_control_exactly':normalized==base},'relative':{'records':records,'changed_byte_values':sum(x!=y for x,y in zip(ab,rel)),'same_file_size':len(ab)==len(rel)},'time_inference':{'erased':erased,'inferred':inferences,'reject_controls':negatives,'restored_control_exactly':rebuilt==base,'erased_timestamp_payloads_poisoned':True},'equivalence':{}}
for x,y in [('control.mp4','explicit_rate.mp4'),('control.mp4','canonical_rate.mp4'),('absolute.mp4','relative.mp4'),('control.mp4','inferred_tfdt.mp4'),('absolute.mp4','compound_7.mp4')]:
 a,b=manifest[x],manifest[y];summary['equivalence'][x+' -> '+y]={key:(a[key]==b[key] if key in a and key in b else 'unavailable-original-host-decode-rejected') for key in ['packets','video_sha256','audio_sha256','mdat_hashes']}
(E/'component.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))

# SPDX-License-Identifier: Apache-2.0
import pathlib,struct,json,subprocess,time,hashlib,sys
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
def ff(args):return subprocess.check_output(['ffmpeg','-v','error','-nostdin','-y',*args],timeout=30)
source=out/'source.mp4';ff(['-f','lavfi','-i','testsrc2=size=160x96:rate=24:duration=6','-c:v','libx264','-preset','fast','-g','24','-bf','0','-pix_fmt','yuv420p',str(source)])
def boxes(b):
 at=0
 while at<len(b):
  n=struct.unpack_from('>I',b,at)[0];assert n>=8 and at+n<=len(b);yield b[at+4:at+8],b[at+8:at+n];at+=n

def box(t,p):return struct.pack('>I',len(p)+8)+t+p
u=lambda n:struct.pack('>I',n)
t=time.perf_counter();data=source.read_bytes();identity=hashlib.sha256(data).hexdigest();info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-of','json',str(source)]));packets=info['packets'];track=info['streams'][0];assert track['time_base']=='1/12288';assert all(p['pts']==p['dts'] and p['duration']==512 for p in packets);selected=packets[48:96];assert 'K' in selected[0]['flags'];sizes=[int(p['size']) for p in selected];total=sum(sizes);top=dict(boxes(data));offset=0

def rewrite(t,p):
 if t in [b'moov',b'trak',b'mdia',b'minf',b'stbl',b'edts']:p=b''.join(rewrite(k,v) for k,v in boxes(p))
 elif t in [b'mvhd',b'mdhd',b'tkhd']:
  p=bytearray(p);assert p[0]==0;struct.pack_into('>I',p,20 if t==b'tkhd' else 16,24576 if t==b'mdhd' else 2000);p=bytes(p)
 elif t==b'elst':
  assert p[0]==0 and struct.unpack_from('>I',p,4)[0]==1 and struct.unpack_from('>i',p,12)[0]==0;p=bytearray(p);struct.pack_into('>I',p,8,2000);p=bytes(p)
 elif t==b'stts':p=bytes(4)+u(1)+u(48)+u(512)
 elif t==b'stsc':p=bytes(4)+u(1)+u(1)+u(48)+u(1)
 elif t==b'stsz':p=bytes(4)+u(0)+u(48)+b''.join(map(u,sizes))
 elif t==b'stss':
  keys=[i+1 for i,p in enumerate(selected) if 'K' in p['flags']];p=bytes(4)+u(len(keys))+b''.join(map(u,keys))
 elif t==b'stco':p=bytes(4)+u(1)+u(offset)
 elif t in [b'ctts',b'co64']:raise ValueError('outside no-B/32bit profile')
 return box(t,p)
ftyp=box(b'ftyp',top[b'ftyp']);moov=rewrite(b'moov',top[b'moov']);offset=len(ftyp)+len(moov)+8;moov=rewrite(b'moov',top[b'moov']);headers=ftyp+moov+u(total+8)+b'mdat';assert len(headers)==offset
extents=[];at=offset
for p in selected:
 extents.append({'output':at,'source':int(p['pos']),'length':int(p['size'])});at+=int(p['size'])
(out/'headers.bin').write_bytes(headers);meta={'sourceSHA256':identity,'sourceBytes':len(data),'outputBytes':at,'headerBytes':len(headers),'extents':extents,'prepareMs':(time.perf_counter()-t)*1000,'scope':'Video-only closed-GOP 2s–4s edit from no-B fixed AVC,48frames, local authorized source; no audio joins or multi-edit composition.'};(out/'map.json').write_text(json.dumps(meta,indent=2)+'\n')
# Materialize only an independent validation output, never used by virtual server.
virtual=headers+b''.join(data[e['source']:e['source']+e['length']] for e in extents);(out/'validation.mp4').write_bytes(virtual)
t=time.perf_counter();ff(['-ss','2','-i',str(source),'-t','2','-c','copy','-movflags','+faststart',str(out/'reference.mp4')]);base_ms=(time.perf_counter()-t)*1000
args=['-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'];a=ff(['-i',str(source),'-vf',"select='between(n,48,95)'",*args]);b=ff(['-i',str(out/'validation.mp4'),*args]);c=ff(['-i',str(out/'reference.mp4'),*args]);assert a==b==c and len(a)==48*160*96*3//2
r={'passed':True,'framesExact':48,'oracleSHA256':hashlib.sha256(a).hexdigest(),'candidatePrepareMs':meta['prepareMs'],'baselinePrepareMs':base_ms,'materializedBytes':len(virtual),'retainedHeaderBytes':len(headers),'mapEntries':len(extents),'plan':'5 alternating native first-frame+forward/backseek owners; complete single-use preparation and cold source identity included, cost gate >=5percent median saving. Metadata retention is not processRSS.'};(out/'fixture-result.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))

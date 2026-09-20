# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,hashlib,time,statistics,sys,ast,struct
root=pathlib.Path.cwd();out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);mode=sys.argv[2];commands=[]
def call(args):
 commands.append(args);return subprocess.check_output(args,stderr=subprocess.DEVNULL)
def decode(p):return call(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-'])
def sha(b):return hashlib.sha256(b).hexdigest()
if mode=='mp3':
 source=root/'results/top100/mp3/source.mp3';key='R230.exact-mp3-seek-closure.report-continuity';targets=[100,220]*10;fb=1152*8
 protocol={'item':key,'workload':'20 alternating exact suffix seek queries at MP3 packets100/220; source48k stereo128k noXing','threshold':.9,'metric':'Complete batch wall candidate versus repeated continuous decode+crop, includes one cold ffprobe index, source read/hash, per-query compressedwrite,process,PCMtransfer,crop;1warmup5 alternatingpairs','scope':'Measured3frame72ms closure only for pinned source and targets, not universal MP3 rule'}
 expected_source=sha(source.read_bytes())
 def index():
  data=source.read_bytes();assert sha(data)==expected_source
  packets=json.loads(call(['ffprobe','-v','error','-show_packets','-of','json',str(source)]))['packets'];assert all(p['duration']==338688 for p in packets);return data,packets
 def candidate():
  data,ps=index();results=[]
  for t in targets:
   p=out/'seek.mp3';p.write_bytes(b''.join(data[int(x['pos']):int(x['pos'])+int(x['size'])] for x in ps[t-3:]));results.append(decode(p)[3*fb:])
  return results
 def baseline():return [decode(source)[t*fb:] for t in targets]
else:
 source=root/'research/shared/runs/20260919T200716Z-ogg-crop/source.ogg';key='R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming'
 protocol={'item':key,'workload':'Exactmono48k55545sample crop12345:67890 retainingfullcompressedprefix','threshold':.9,'metric':'Complete cold copyauthor+decode versus fullsource decode+slice;1warmup5alternatingpairs. Prepareddecode separately reported','scope':'Pinned20msOpusframes; fullprefix required, no shortenedpreroll or othercontainer claim'}
 tree=ast.parse((root/'research/shared/tooling/audio-stage-probes/ogg_crop.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='page'],type_ignores=[]),'page','exec'))
 def author():
  data=source.read_bytes();pos=0;packets=[];pending=b''
  while pos<len(data):
   assert data[pos:pos+4]==b'OggS';count=data[pos+26];at=pos+27+count
   for n in data[pos+27:pos+27+count]:
    pending+=data[at:at+n];at+=n
    if n<255:packets.append(pending);pending=b''
   pos=at
  pre=struct.unpack_from('<H',packets[0],10)[0];head=bytearray(packets[0]);struct.pack_into('<H',head,10,pre+12345);n=(67890+pre+959)//960;chunks=[page(head,0,0,2),page(packets[1],1,0,0)]
  for i,p in enumerate(packets[2:2+n]):
   assert (p[0]&3)==0 and ((p[0]>>3)&3)==3
   chunks.append(page(p,i+2,min((i+1)*960,67890+pre),4 if i==n-1 else 0))
  p=out/'crop.ogg';p.write_bytes(b''.join(chunks));return p
 def candidate():return [decode(author())]
 def baseline():return [decode(source)[12345*4:67890*4]]
(out/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n');reference=baseline();actual=candidate();assert actual==reference
controls={}
if mode=='mp3':
 data,ps=index();p=out/'wrong-no-preroll.mp3';p.write_bytes(b''.join(data[int(x['pos']):int(x['pos'])+int(x['size'])] for x in ps[100:]));controls['noPrerollRejected']=decode(p)!=reference[0];assert controls['noPrerollRejected'];controls['wrongSourceIdentityRejected']=sha(data+b'changed')!=expected_source
else:
 p=root/'research/shared/runs/20260919T200716Z-ogg-crop/wrong-packet-only.ogg';controls['wrongPreskipRejected']=decode(p)!=reference[0];assert controls['wrongPreskipRejected']
rows=[]
for i in range(6):
 for name,f in ([('candidate',candidate),('baseline',baseline)] if i%2==0 else [('baseline',baseline),('candidate',candidate)]):
  t=time.perf_counter();a=f();ms=(time.perf_counter()-t)*1000;assert a==reference
  if i:rows.append({'pair':i,'route':name,'ms':ms})
c=statistics.median(r['ms'] for r in rows if r['route']=='candidate');b=statistics.median(r['ms'] for r in rows if r['route']=='baseline');result={'correctnessPassed':True,'controls':controls,'rows':rows,'candidateMedianMs':c,'baselineMedianMs':b,'ratio':c/b,'performancePassed':c/b<=.9,'outputSHA256':[sha(x) for x in reference],'sourceSHA256':sha(source.read_bytes())}
if mode=='ogg':
 samples=[]
 for i in range(5):
  t=time.perf_counter();a=decode(out/'crop.ogg');samples.append((time.perf_counter()-t)*1000);assert a==reference[0]
 result['preparedDecodeMs']=samples;result['preparedMedianMs']=statistics.median(samples)
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');(out/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print({k:v for k,v in result.items() if k not in ['rows','outputSHA256']})

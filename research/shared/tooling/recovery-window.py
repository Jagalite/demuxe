# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib,time,statistics
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);source=out/'source.h264';subprocess.run(['ffmpeg','-v','error','-nostdin','-f','lavfi','-i','testsrc2=size=160x96:rate=30:duration=6','-c:v','libx264','-preset','veryfast','-bf','0','-refs','1','-x264-params','intra-refresh=1:keyint=30:min-keyint=30:scenecut=0:repeat-headers=1','-f','h264',str(source)],check=True)
data=source.read_bytes();probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-of','json',str(source)]));packets=[data[int(p['pos']):int(p['pos'])+int(p['size'])] for p in probe['packets']]
def nals(p):
 starts=[];i=0
 while i<len(p)-3:
  n=4 if p[i:i+4]==b'\0\0\0\1' else 3 if p[i:i+3]==b'\0\0\1' else 0
  if n:starts.append((i,n));i+=n
  else:i+=1
 return [p[a+n:(starts[j+1][0] if j+1<len(starts) else len(p))] for j,(a,n) in enumerate(starts)]
def recovery(p):
 for n in nals(p):
  if n[0]&31!=6:continue
  b=n[1:].replace(b'\0\0\3',b'\0\0');at=0
  while at<len(b)-1:
   kind=size=0
   while b[at]==255:kind+=255;at+=1
   kind+=b[at];at+=1
   while b[at]==255:size+=255;at+=1
   size+=b[at];at+=1;body=b[at:at+size];at+=size
   if kind==6:
    bits=''.join(f'{x:08b}' for x in body);z=bits.index('1');count=int(bits[z:2*z+1],2)-1;return {'count':count,'exact':int(bits[2*z+1]),'broken':int(bits[2*z+2])}
 raise ValueError('no recovery point')
config=b''.join(b'\0\0\0\1'+n for n in nals(packets[0]) if n[0]&31 in (7,8))
def decode(p):
 r=subprocess.run(['ffmpeg','-v','error','-nostdin','-flags2','+showall','-i',str(p),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=20);return r.stdout,r.stderr.decode()
full,_=decode(source);size=23040;assert len(full)==180*size;cases=[]
for cut in [30,60,90,120]:
 point=recovery(packets[cut]);assert point['exact']==1;p=out/f'cut-{cut}.h264';p.write_bytes(config+b''.join(packets[cut:]));raw,errors=decode(p);assert len(raw)==(180-cut)*size;matches=[raw[i*size:(i+1)*size]==full[(cut+i)*size:(cut+i+1)*size] for i in range(180-cut)];safe=point['count']+1;assert all(matches[safe:]) and not all(matches);first=next(i for i in range(len(matches)) if all(matches[i:]));cases.append({'cut':cut,'point':point,'firstExactSuffix':first,'conservativeAdmission':safe,'matches':matches,'stderr':errors})
plan={'scope':'Periodic intra-refresh AVC, no Bframes/one reference, fresh software decoder with showall exposes incomplete warmup. SEI exact_match and count bound conservative admission; normal IDR prefix baseline to identical target. No native/WebCodecs admission claim.','gate':'All conservative suffix frames exact at4cut points; wrong immediate admission must fail. Nine alternating jobs answer4targets, charge source read/config and SEI parse, compressed prefix build/write, fresh decode/target extraction. Require5percent median complete cost saving.'};(out/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');rows=[]
for pair in range(9):
 row={'pair':pair}
 for mode in (['recovery','prefix'] if pair%2 else ['prefix','recovery']):
  t=time.perf_counter();cold=source.read_bytes();ps=[cold[int(p['pos']):int(p['pos'])+int(p['size'])] for p in probe['packets']]
  for case in cases:
   cut=case['cut'];point=recovery(ps[cut]);target=cut+point['count']+1;start=cut if mode=='recovery' else 0;p=out/'job.h264';p.write_bytes(config+b''.join(ps[start:target+1]));raw,_=decode(p);assert raw[-size:]==full[target*size:(target+1)*size]
  row[mode]=(time.perf_counter()-t)*1000
 rows.append(row)
values=[1-r['recovery']/r['prefix'] for r in rows];result={'plan':plan,'cases':cases,'rows':rows,'analysis':{'medianSaving':statistics.median(values),'minimum':min(values),'maximum':max(values),'accepted':statistics.median(values)>.05},'passed':True};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'cases':[{k:v for k,v in c.items() if k not in ['matches','stderr']} for c in cases],'analysis':result['analysis']}))

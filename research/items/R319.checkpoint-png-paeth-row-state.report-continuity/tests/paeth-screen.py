# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,struct,zlib,subprocess,json,time,random,statistics,hashlib
p=Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);W=H=512;raw=bytes(v for y in range(H) for x in range(W) for v in ((x*3+y)%256,(y*5+x//7)%256,(x^y)%256,255));filtered=bytearray()
def paeth(a,b,c):
 p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c);return a if pa<=pb and pa<=pc else b if pb<=pc else c
for y in range(H):
 filtered.append(4)
 for i in range(W*4):
  at=y*W*4+i;a=raw[at-4] if i>=4 else 0;b=raw[at-W*4] if y else 0;c=raw[at-W*4-4] if y and i>=4 else 0;filtered.append((raw[at]-paeth(a,b,c))%256)
def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b))
compressed=zlib.compress(filtered,6);png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',W,H,8,6,0,0,0))+chunk(b'IDAT',compressed)+chunk(b'IEND',b'');(p/'source.png').write_bytes(png);(p/'inflated.bin').write_bytes(filtered)
def run(cmd,okay=True):
 with (p/'commands.log').open('a') as f:f.write(' '.join(map(str,cmd))+'\n')
 r=subprocess.run(list(map(str,cmd)),capture_output=True)
 if okay:assert r.returncode==0,r.stderr.decode()
 return r
reference=run(['ffmpeg','-v','error','-i',p/'source.png','-pix_fmt','rgba','-f','rawvideo','-']).stdout;assert reference==raw;(p/'reference.rgba').write_bytes(reference);binary='build/catalogue-tools/png-paeth-bands';run(['cc','-O2','research/items/R319.checkpoint-png-paeth-row-state.report-continuity/tests/paeth-bands.c','-o',binary]);starts=[448,192,384,64,256,128,480,320,32,416];expected=b''.join(raw[y*2048:(y+16)*2048] for y in starts);results={}
for mode in ['baseline','checkpoint']:
 r=run([binary,mode,p/'inflated.bin']);assert r.stdout==expected;results[mode]=json.loads(r.stderr)
controls={}
for bad,code in [('corrupt-checkpoint',5),('changed-source',6)]:
 r=run([binary,'checkpoint',p/'inflated.bin',bad],False);assert r.returncode==code and not r.stdout;controls[bad]=r.returncode
pairs=[];inflate=[]
for i in range(9):
 pair={}
 for mode in (['checkpoint','baseline'] if i%2 else ['baseline','checkpoint']):
  t=time.perf_counter();assert zlib.decompress(compressed)==filtered;inflate.append((time.perf_counter()-t)*1000)
  t=time.perf_counter();r=run([binary,mode,p/'inflated.bin']);assert r.stdout==expected;pair['candidate' if mode=='checkpoint' else 'baseline']=(time.perf_counter()-t)*1000
 pairs.append(pair)
b=[x['baseline'] for x in pairs];c=[x['candidate'] for x in pairs];rng=random.Random(319);boot=[]
for _ in range(10000):
 ids=[rng.randrange(9) for _ in range(9)];boot.append(100*(1-sum(c[i] for i in ids)/sum(b[i] for i in ids)))
boot.sort();d={'correctness':True,'sourcePNGsha256':hashlib.sha256(png).hexdigest(),'requestedBandStarts':starts,'bandHeight':16,'negativeControls':controls,'allocationAndWork':results,'pairs':pairs,'wholeFileInflateMeanMs_separate':statistics.mean(inflate),'wholeFileInflateBytes':len(filtered),'baseline_mean_ms':statistics.mean(b),'candidate_mean_ms':statistics.mean(c),'saving_percent':100*(1-sum(c)/sum(b)),'bootstrap95':[boot[250],boot[9750]],'performance':boot[250]>=10};(p/'results.json').write_text(json.dumps(d,indent=2));print(json.dumps(d))

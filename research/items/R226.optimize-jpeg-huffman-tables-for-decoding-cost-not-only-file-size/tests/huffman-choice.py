# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,subprocess,time,statistics,random,hashlib
r=Path(sys.argv[1]);src=Path(sys.argv[2]);cmds=[]
def call(a):
 cmds.append(a);p=subprocess.run(a,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.decode())
 return p.stdout
def transform(a,b,opt=False):return call(['jpegtran','-copy','none',*(['-optimize'] if opt else []),'-outfile',str(b),str(a)])
def coeff(f):return json.loads(call(['build/catalogue-tools/jpeg-coefficients',str(f)]))
def dht(f):
 b=f.read_bytes();i=2;result=[]
 while i<len(b):
  t=b[i+1]
  if t==0xda:break
  n=int.from_bytes(b[i+2:i+4],'big')
  if t==0xc4:result.append(b[i+4:i+2+n].hex())
  i+=n+2
 return result
stats=[];digests=[]
for n in range(3):
 source=src/f'source{n}.jpg';base=r/f'optimized{n}.jpg';candidate=r/f'default{n}.jpg';transform(source,base,True);t=time.perf_counter();transform(base,candidate);setup=(time.perf_counter()-t)*1000;a=coeff(base);b=coeff(candidate);assert a==b and dht(base)!=dht(candidate)
 pixels=[]
 for f in [base,candidate]:pixels.append(call(['ffmpeg','-v','error','-i',str(f),'-f','rawvideo','-pix_fmt','rgb24','-']))
 assert pixels[0]==pixels[1];d=json.loads(call(['build/catalogue-tools/jpeg-huffman-cost',str(base),'1']));e=json.loads(call(['build/catalogue-tools/jpeg-huffman-cost',str(candidate),'1']));assert d==e;digests.append(d['digest']);stats.append({'frame':n,'optimized_bytes':base.stat().st_size,'default_bytes':candidate.stat().st_size,'rewrite_ms':setup,'coefficient_values':len(a['blocks'])*64,'full_rgb_hash':hashlib.sha256(pixels[0]).hexdigest(),'dht_changed':True})
assert digests[0]!=digests[1];(r/'malformed.jpg').write_bytes((r/'optimized0.jpg').read_bytes()[:10]);bad=subprocess.run(['build/catalogue-tools/jpeg-huffman-cost',str(r/'malformed.jpg'),'1'],capture_output=True);assert bad.returncode;(r/'malformed.log').write_bytes(bad.stderr)
def task(candidate):
 start=time.perf_counter()
 for n in range(3):
  f=r/f'{"default" if candidate else "optimized"}{n}.jpg'
  if candidate:transform(r/f'optimized{n}.jpg',f)
  d=json.loads(call(['build/catalogue-tools/jpeg-huffman-cost',str(f),'100']));assert d['digest']==digests[n] and d['all_destroyed']
 return (time.perf_counter()-start)*1000
pairs=[]
for i in range(9):
 if i%2:b=task(True);a=task(False)
 else:a=task(False);b=task(True)
 pairs.append({'baseline_ms':a,'candidate_ms':b})
a=statistics.mean(p['baseline_ms'] for p in pairs);b=statistics.mean(p['candidate_ms'] for p in pairs);rng=random.Random(226);boot=[]
for _ in range(10000):
 samples=rng.choices(pairs,k=9);boot.append(100*(1-sum(p['candidate_ms'] for p in samples)/sum(p['baseline_ms'] for p in samples)))
boot.sort();result={'correctness':True,'fixtures':stats,'pairs':pairs,'baseline_mean_ms':a,'candidate_mean_ms':b,'saving_percent':100*(1-b/a),'bootstrap95':[boot[250],boot[9749]],'performance_passed':boot[250]>=10,'wrong_source_digest_differs':True,'malformed_exit':bad.returncode,'all_process_owners_closed':True,'cost_scope':'3images×100decoders, candidate charged entropyrewrite beforeeach job'};(r/'results.json').write_text(json.dumps(result,indent=2));(r/'commands.json').write_text(json.dumps(cmds,indent=2));print({k:result[k] for k in ['baseline_mean_ms','candidate_mean_ms','saving_percent','bootstrap95','performance_passed']})

# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,concurrent.futures,json,time,random,statistics,hashlib,sys
out=Path(sys.argv[1]);src=Path('results/top100/ffv1');commands=[]
def ff(args):
 cmd=['ffmpeg','-v','error']+list(map(str,args));commands.append(cmd);return subprocess.check_output(cmd)
plan={'declared_before_execution':True,'workload':'Prepared twelve160x96BGR0 FFV1frames. Baseline one native process with4decoderthreads versus four independent80x48 quadrantprocesses with1decoderthread each and parentassembly. Both completeprocessstartup/read/decode/outputtransfer/assembly/sourceoracle/teardown walltime. Preparation encoding excluded and24351vs28965compressedbytes reported, no originalFFV1sliceextraction or browserclaim.','oracle':'Independent original testsrc rawBGR0 generator mustmatch fullsource decode and every assembled quadrant; swappedquadrant negative.','sampling':'Ninealternatingfreshprocesspairs,10000pairedbootstrapseed2051 lower95saving>=10%; warmfilecache/concurrentload limitation.'};(out/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
reference=ff(['-f','lavfi','-i','testsrc=s=160x96:r=12:d=1','-pix_fmt','bgr0','-f','rawvideo','-']);assert len(reference)==12*160*96*4;(out/'source-reference.bgr0').write_bytes(reference)
def decode(path,threads):return ff(['-threads',threads,'-i',path,'-pix_fmt','bgr0','-fps_mode','passthrough','-f','rawvideo','-'])
def assemble(parts):
 output=bytearray()
 for n in range(12):
  for row in range(96):
   for col in range(2):
    q=row//48*2+col;at=(n*48+row%48)*80*4;output.extend(parts[q][at:at+80*4])
 return bytes(output)
parts=[decode(src/f'q{i}.mkv',1) for i in range(4)];assert assemble(parts)==reference;parts[0],parts[1]=parts[1],parts[0];assert assemble(parts)!=reference
def trial(candidate):
 start=time.perf_counter()
 if candidate:
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:actual=assemble(list(pool.map(lambda i:decode(src/f'q{i}.mkv',1),range(4))))
 else:actual=decode(src/'whole.mkv',4)
 assert actual==reference
 return {'candidate':candidate,'wall_ms':(time.perf_counter()-start)*1000,'exact':True,'bytes':len(actual),'sha256':hashlib.sha256(actual).hexdigest(),'processes':4 if candidate else 1}
correctness=[trial(False),trial(True)];pairs=[]
for i in range(9):
 p={'pair':i}
 for c in ([True,False] if i%2 else [False,True]):p['candidate' if c else 'baseline']=trial(c)
 pairs.append(p)
b=[p['baseline']['wall_ms'] for p in pairs];c=[p['candidate']['wall_ms'] for p in pairs];r=random.Random(2051);boot=[]
for _ in range(10000):
 ids=[r.randrange(9) for _ in range(9)];boot.append(100*(1-sum(c[i] for i in ids)/sum(b[i] for i in ids)))
boot.sort();stats={'baseline_mean_ms':statistics.mean(b),'candidate_mean_ms':statistics.mean(c),'saving_percent':100*(1-sum(c)/sum(b)),'bootstrap95':[boot[250],boot[9749]],'gate_passed':boot[250]>=10,'pairs':9,'seed':2051,'resamples':10000};(out/'statistics.json').write_text(json.dumps(stats,indent=2)+'\n');(out/'results.json').write_text(json.dumps({'correctness':correctness,'pairs':pairs,'swappedQuadrantRejected':True,'independentOriginalSourceExact':True,'compressedWholeBytes':(src/'whole.mkv').stat().st_size,'compressedQuadrantBytes':sum((src/f'q{i}.mkv').stat().st_size for i in range(4)),'statistics':stats},indent=2)+'\n');(out/'commands.log').write_text('\n'.join(' '.join(c) for c in commands)+'\n');print(json.dumps(stats))

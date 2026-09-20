# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,time,random,statistics,sys
out=Path(sys.argv[1]);source=Path('research/items/R202.guarded-narrow-arithmetic/tests/guard-cost.c');binary=Path('build/catalogue-tools/idct-guard-cost');ubsan=Path('build/catalogue-tools/idct-guard-cost-ubsan');commands=[]
plan={'declared_before_execution':True,'scope':'Pinned scalar8bit4x4 IDCT, guardedint16candidate including fallback; notSIMD or actualcodec admission.4096deterministic blocks,50%within2672guard and50%ineligible3000. One millionblockowner tasks; inputgeneration and4096exactprechecks included in externalwholeprocesswall; separatekernel timing diagnostic.','baseline':'Pinned fullwidth body withoutguard','candidate':'Guard everyblock, narrowbody ifeligible otherwise pinnedbaseline; includeallcopy/checksum/dispatch cost','correctness':'Retained85536corner/randomUBSan proof plus4096mixedblocks exactpixels+clearedcoefficients eachprocess, sharedchecksum. FreshUBSanbuildbefore release timing.','sampling':'Ninealternatingfreshprocesspairs,wholeprocesswall includesstartup/prechecks/fixturegeneration/exit;10000pairedbootstrapseed2021 lower95saving>=10%. Syntheticadmissiondistribution, warmfiles/concurrenthost caveats.'};(out/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
for target,flags in [(ubsan,['-O2','-fsanitize=undefined']),(binary,['-O3'])]:
 cmd=['clang',*flags,str(source),'-o',str(target)];commands.append(cmd);r=subprocess.run(cmd,capture_output=True);(out/(target.name+'-compile.log')).write_bytes(r.stderr);assert r.returncode==0
r=subprocess.run([str(ubsan),'1','4096'],capture_output=True);assert r.returncode==0 and not r.stderr;(out/'ubsan.json').write_bytes(r.stdout)
def trial(candidate):
 cmd=[str(binary),str(int(candidate)),'1000000'];commands.append(cmd);start=time.perf_counter();r=subprocess.run(cmd,capture_output=True);wall=(time.perf_counter()-start)*1000;assert r.returncode==0 and not r.stderr;d=json.loads(r.stdout);d['wall_ms']=wall;return d
correctness=[trial(False),trial(True)];assert correctness[0]['checksum']==correctness[1]['checksum'];pairs=[]
for i in range(9):
 p={'pair':i}
 for c in ([True,False] if i%2 else [False,True]):p['candidate' if c else 'baseline']=trial(c)
 assert p['baseline']['checksum']==p['candidate']['checksum'];pairs.append(p)
b=[p['baseline']['wall_ms'] for p in pairs];c=[p['candidate']['wall_ms'] for p in pairs];r=random.Random(2021);boot=[]
for _ in range(10000):
 ids=[r.randrange(9) for _ in range(9)];boot.append(100*(1-sum(c[i] for i in ids)/sum(b[i] for i in ids)))
boot.sort();stats={'baseline_mean_ms':statistics.mean(b),'candidate_mean_ms':statistics.mean(c),'saving_percent':100*(1-sum(c)/sum(b)),'bootstrap95':[boot[250],boot[9749]],'gate_passed':boot[250]>=10,'pairs':9,'seed':2021,'resamples':10000};(out/'statistics.json').write_text(json.dumps(stats,indent=2)+'\n');(out/'results.json').write_text(json.dumps({'correctness':correctness,'pairs':pairs,'statistics':stats},indent=2)+'\n');(out/'commands.log').write_text('\n'.join(' '.join(c) for c in commands)+'\n');print(json.dumps(stats))

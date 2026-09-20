# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,ast,time,statistics
p=pathlib.Path(sys.argv[1]);r=json.loads((p/'results.json').read_text());assert all(x['correctnessPassed'] for x in r['rows'] if x['mode']!='wrong-offset');b=['ffmpeg','-v','error','-y'];commands=[]
def call(a):commands.append(a);return subprocess.check_output(a,stderr=subprocess.DEVNULL)
tree=ast.parse(pathlib.Path('research/shared/tooling/audio-stage-probes/stable_flac_switch.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='prep'],type_ignores=[]),'prep','exec'));rows=[]
for i in range(6):
 for stable in ([True,False] if i%2==0 else [False,True]):
  t=time.perf_counter();prep(stable);ms=(time.perf_counter()-t)*1000
  if i:rows.append({'pair':i,'stable':stable,'ms':ms})
(p/'host-cost.json').write_text(json.dumps({'rows':rows,'stableMedianMs':statistics.median(r['ms'] for r in rows if r['stable']),'nativeMedianMs':statistics.median(r['ms'] for r in rows if not r['stable'])},indent=2));(p/'cost-commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n')

# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,sys,time,json,re,statistics,random
out=pathlib.Path(sys.argv[1]);snippet="""import ast,pathlib,json
p='results/top100/captions/fixture.py';t=ast.parse(pathlib.Path(p).read_text());t.body=[n for n in t.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef))];ns={};exec(compile(t,p,'exec'),ns);b=pathlib.Path('results/top100/captions/caption.h264').read_bytes();print(json.dumps([ns['extract'](v) for v in ns['find_registered'](b)]))
"""
result={'plan':json.loads((out/'plan.json').read_text()),'rows':[]}
for pair in range(11):
 row={'pair':pair}
 for mode in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
  start=time.perf_counter()
  if mode=='candidate':b=subprocess.check_output([sys.executable,'-c',snippet]);text=json.loads(b);assert text==['HI']
  else:
   b=subprocess.check_output(['ffmpeg','-v','error','-f','lavfi','-i','movie=results/top100/captions/caption.mp4[out0+subcc]','-map','0:s:0','-c:s','srt','-f','srt','-']);s=b.decode();assert 'HI' in s and '00:00:00,000 --> 00:00:00,000' in s;text=['HI']
  row[mode]={'ms':(time.perf_counter()-start)*1000,'caption':text,'coldProcess':True}
 result['rows'].append(row)
values=[1-r['candidate']['ms']/r['baseline']['ms'] for r in result['rows']];rng=random.Random(60);bs=sorted(statistics.median(rng.choices(values,k=11)) for _ in range(10000));result['analysis']={'medianSaving':statistics.median(values),'bootstrap95':[bs[250],bs[9750]],'accepted':bs[250]>.05};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(result['analysis'])

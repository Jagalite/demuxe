# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,hashlib,subprocess,array,time,statistics,json
import aac_sce_parser as parser
from aac_sce_parser import *
p=pathlib.Path(sys.argv[1]);tree=ast.parse(pathlib.Path(__file__).with_name('aac_elements_probe.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['pce','select']],type_ignores=[]),__file__,'exec'));PCE=pce();identity=hashlib.sha256((p/'source.aac').read_bytes()).hexdigest()
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
expected=decode(p/'mono4.aac');times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns()
  if variant=='candidate':
   parser.T=parser.tables();parser.HUFF={i:{(n,c):k for k,(n,c)in enumerate(zip(parser.T['bits'+str(i)],parser.T['codes'+str(i)]))}for i in range(1,12)};parser.HUFF[0]={(n,c):k for k,(n,c)in enumerate(zip(parser.T['ff_aac_scalefactor_bits'],parser.T['ff_aac_scalefactor_code']))};out,_=select((p/'source.aac').read_bytes(),identity);dest=p/'timed.aac';dest.write_bytes(out);raw=decode(dest)
  else:
   data=(p/'source.aac').read_bytes();assert hashlib.sha256(data).hexdigest()==identity;full=array.array('f');full.frombytes(decode(p/'source.aac'));raw=full[4::6].tobytes()
  ms=(time.perf_counter_ns()-start)/1e6;assert raw==expected
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];result={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9,'sourceBytes':(p/'source.aac').stat().st_size,'selectedBytes':(p/'selected.aac').stat().st_size,'coldTablesIncluded':True};(p/'cost-results.json').write_text(json.dumps(result,indent=2))
with(p/'commands.log').open('a')as f:f.write('node research/shared/tooling/audio-stage-probes/aac_elements_browser.mjs '+str(p)+'\npython3 research/shared/tooling/audio-stage-probes/aac_elements_cost.py '+str(p)+'\n')
print(result)

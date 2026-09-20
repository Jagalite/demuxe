# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,hashlib,subprocess,array,time,statistics,json
import aac_sce_parser as parser
from aac_sce_parser import *
p=pathlib.Path(sys.argv[1]);tree=ast.parse(pathlib.Path(__file__).with_name('aac_stereo_assembly.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['prefix','assemble']],type_ignores=[]),__file__,'exec'));claims=json.loads((p/'protocol.json').read_text())['claims'];inputs=[pathlib.Path('research/shared/runs/20260919T230128Z-aac-elements')/f'mono{i}.aac'for i in [0,4]]
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
expected=decode(p/'stereo.aac');times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns()
  if variant=='candidate':
   parser.T=parser.tables();parser.HUFF={i:{(n,c):k for k,(n,c)in enumerate(zip(parser.T['bits'+str(i)],parser.T['codes'+str(i)]))}for i in range(1,12)};parser.HUFF[0]={(n,c):k for k,(n,c)in enumerate(zip(parser.T['ff_aac_scalefactor_bits'],parser.T['ff_aac_scalefactor_code']))};out=assemble([f.read_bytes()for f in inputs],claims);dest=p/'timed.aac';dest.write_bytes(out);raw=decode(dest)
  else:
   refs=[]
   for path,claim in zip(inputs,claims):
    assert hashlib.sha256(path.read_bytes()).hexdigest()==claim['sha256'];a=array.array('f');a.frombytes(decode(path));refs.append(a)
   out=array.array('f',[0])*(len(refs[0])*2);out[0::2]=refs[0];out[1::2]=refs[1];raw=out.tobytes()
  ms=(time.perf_counter_ns()-start)/1e6;assert raw==expected
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];result={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9,'coldTablesIncluded':True};(p/'cost-results.json').write_text(json.dumps(result,indent=2))
with(p/'commands.log').open('a')as f:f.write('node research/shared/tooling/audio-stage-probes/aac_stereo_browser.mjs '+str(p)+'\npython3 research/shared/tooling/audio-stage-probes/aac_stereo_cost.py '+str(p)+'\n')
print(result)

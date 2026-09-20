# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,sys,json,time,statistics,random,hashlib
out=pathlib.Path(sys.argv[1]);source='results/full-completion/r59/selected-reference.mp4'
node="import {adapt} from './results/top100/mp4/adapter.mjs';import{readFileSync}from'node:fs';process.stdout.write(adapt(new Uint8Array(readFileSync(process.argv[1]))).bytes);"
def decode(path,kind):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:'+kind+':0',*(['-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo'] if kind=='v' else ['-f','f32le']),'-'])
oracle=[decode(source,k) for k in ['v','a']];result={'plan':json.loads((out/'plan.json').read_text()),'rows':[],'diagnostics':[]}
try:
 for pair in range(11):
  row={'pair':pair}
  for mode in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
   start=time.perf_counter()
   if mode=='candidate':data=subprocess.check_output(['node','--input-type=module','-e',node,source])
   else:data=subprocess.check_output(['ffmpeg','-v','error','-i',source,'-map','0','-c','copy','-movflags','frag_keyframe+delay_moov+default_base_moof','-f','mp4','-'])
   path=out/(mode+'.mp4');path.write_bytes(data);raw=[decode(path,k) for k in ['v','a']];ms=(time.perf_counter()-start)*1000
   result['diagnostics'].append({'pair':pair,'mode':mode,'rawLengths':[len(x) for x in raw],'oracleLengths':[len(x) for x in oracle],'rawHashes':[hashlib.sha256(x).hexdigest() for x in raw],'exact':raw==oracle})
   assert raw==oracle,(mode,'fullA/V oracle');row[mode]={'ms':ms,'preparedBytes':len(data),'exact':True}
  result['rows'].append(row)
 vals=[1-r['candidate']['ms']/r['baseline']['ms'] for r in result['rows']];rng=random.Random(46);bs=sorted(statistics.median(rng.choices(vals,k=11)) for _ in range(10000));result['analysis']={'medianSaving':statistics.median(vals),'bootstrap95':[bs[250],bs[9750]],'accepted':bs[250]>.05};result['passed']=True
except Exception as e:result['error']=str(e)
finally:(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'analysis':result.get('analysis'),'error':result.get('error')}))

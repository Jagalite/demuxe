# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,array,time,statistics
from flac_predictive_edits import mix,lpc_to_fixed,edit_warmups,decode
p=pathlib.Path(sys.argv[1]);mode=json.loads((p/'results.json').read_text())['mode'];expected=(p/'reference.s16').read_bytes();times={'candidate':[],'baseline':[]};commands=[]
q='mod(n,32)';poly=f'if(lt(n,32),5,if(lt(n,64),2*{q}-20,if(lt(n,96),{q}*({q}-1)/2-50,{q}*({q}-1)*({q}-2)/6-200)))'
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();source=p/'source.flac';dest=p/'timed.flac'
  if variant=='candidate':
   data=source.read_bytes();out=mix(data,(p/'second.flac').read_bytes())if mode=='mix'else(lpc_to_fixed(data)if mode=='lpc'else edit_warmups(data));dest.write_bytes(out);raw=decode(dest)
  elif mode=='lpc':raw=decode(source)
  else:
   cmd=['ffmpeg','-v','error','-y','-i',str(source)]
   if mode=='mix':cmd+=['-i',str(p/'second.flac'),'-filter_complex','[0:a][1:a]amix=inputs=2:normalize=0[a]','-map','[a]']
   else:cmd+=['-af',"aeval='val(0)+("+poly+")/32768'"]
   cmd+=['-sample_fmt','s16','-c:a','flac',str(dest)];subprocess.run(cmd,check=True);raw=decode(dest);commands.append(cmd)
  ms=(time.perf_counter_ns()-start)/1e6;assert raw==expected,(mode,variant)
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];result={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(result,indent=2))
with(p/'commands.log').open('a')as f:f.write('node research/shared/tooling/audio-stage-probes/flac_predictive_browser.mjs '+str(p)+'\npython3 research/shared/tooling/audio-stage-probes/flac_predictive_cost.py '+str(p)+'\n'+'\n'.join(map(json.dumps,commands))+'\n')
print(mode,result)

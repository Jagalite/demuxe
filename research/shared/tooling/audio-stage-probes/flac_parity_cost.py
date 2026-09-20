# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,time,statistics,subprocess
from flac_parity_stereo import convert,decode
p=pathlib.Path(sys.argv[1]);expected=(p/'reference.s16').read_bytes();times={'candidate':[],'baseline':[]};commands=[]
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();source=p/'source.flac';dest=p/'timed.flac'
  if variant=='candidate':dest.write_bytes(convert(source.read_bytes()))
  else:
   cmd=['ffmpeg','-v','error','-y','-i',str(source),'-c:a','flac','-ch_mode','mid_side',str(dest)];subprocess.run(cmd,check=True);commands.append(cmd)
  actual=decode(dest);ms=(time.perf_counter_ns()-start)/1e6;assert actual==expected
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];byteRatio=(p/'output.flac').stat().st_size/(p/'source.flac').stat().st_size;cost={'timesMS':times,'medianMS':med,'ratio':ratio,'byteRatio':byteRatio,'passed':ratio<=.9 and byteRatio<=1.25};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));
with(p/'commands.log').open('a')as f:f.write('node research/shared/tooling/audio-stage-probes/flac_parity_browser.mjs '+str(p)+'\npython3 research/shared/tooling/audio-stage-probes/flac_parity_cost.py '+str(p)+'\n'+'\n'.join(map(json.dumps,commands))+'\n')
print(cost)

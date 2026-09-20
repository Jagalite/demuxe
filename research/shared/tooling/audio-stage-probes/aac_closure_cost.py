# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,time,statistics,json,hashlib
import aac_sce_parser as parser
from aac_edit_closure import SOURCE,REPLACEMENT,EDITS,prepare,edit,decode
p=pathlib.Path(sys.argv[1]);identities=[hashlib.sha256(x.read_bytes()).hexdigest()for x in [SOURCE,REPLACEMENT]];times={'candidate':[],'baseline':[]}
expected=[(p/f'edit{i}.aac').read_bytes()for i in EDITS]
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();raw=SOURCE.read_bytes();replacement=REPLACEMENT.read_bytes();assert [hashlib.sha256(x).hexdigest()for x in [raw,replacement]]==identities;outputs=[];certs=[]
  if variant=='candidate':
   parser.T=parser.tables();parser.HUFF={i:{(n,c):k for k,(n,c)in enumerate(zip(parser.T['bits'+str(i)],parser.T['codes'+str(i)]))}for i in range(1,12)};parser.HUFF[0]={(n,c):k for k,(n,c)in enumerate(zip(parser.T['ff_aac_scalefactor_bits'],parser.T['ff_aac_scalefactor_code']))};prepared=prepare(raw,replacement,*identities)
   for index in EDITS:
    out,cert=edit(prepared,index);outputs.append(out);certs.append({'editedPacket':index,'safeSuffixSample':cert['safeSuffixSample'],'source':identities[0],'replacement':identities[1]})
  else:
   packets=parser.adts_packets(raw);other=parser.adts_packets(replacement);reference=decode(SOURCE)
   for index in EDITS:
    copied=list(packets);copied[index]=other[index];out=b''.join(parser.adts(x,1)for x in copied);dest=p/f'timed-{index}.aac';dest.write_bytes(out);actual=decode(dest);cut=(index+2)*1024;assert actual[cut*4:]==reference[cut*4:];outputs.append(out);certs.append({'editedPacket':index,'safeSuffixSample':cut,'source':identities[0],'replacement':identities[1]})
  for index,out in zip(EDITS,outputs):(p/f'timed-{index}.aac').write_bytes(out)
  (p/'timed-certificates.json').write_text(json.dumps(certs));ms=(time.perf_counter_ns()-start)/1e6;assert outputs==expected
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];result={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9,'coldTableSetupIncluded':True,'endpoint':'Same three edited coded assets and hash-bound certificates for specified unchanged PCM suffixes; candidate structural overlap proof vs independent full decode verification. Consumer profile remains controlled AAC-LC.'};(p/'cost-results.json').write_text(json.dumps(result,indent=2))
with(p/'commands.log').open('a')as f:f.write('node research/shared/tooling/audio-stage-probes/aac_closure_browser.mjs '+str(p)+'\npython3 research/shared/tooling/audio-stage-probes/aac_closure_cost.py '+str(p)+'\n')
print(result)

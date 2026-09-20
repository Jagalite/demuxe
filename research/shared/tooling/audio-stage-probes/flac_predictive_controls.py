# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,array
from flac_predictive_edits import *
p=pathlib.Path(sys.argv[1]);mode=json.loads((p/'results.json').read_text())['mode'];rows={};data=(p/'source.flac').read_bytes()
if mode=='mix':
 n=4096;bad=stream([make(0,n,2,[0,0],residual_bits([0]*(n-2),1))],1,16,n,minblock=n,maxblock=n)
 try:mix(data,bad);raise RuntimeError('mismatched predictor admitted')
 except ValueError as e:rows['predictorMismatchRejected']=str(e)
elif mode=='warm':
 # Higher-degree edit cannot be represented by the stated warmup-only transform.
 r=parse(data)[0];n=r['n'];wrong=stream([make(0,n,1,r['warm'],r['resbits'])],1,16,n,minblock=n,maxblock=n);f=p/'higher-degree-wrong.flac';f.write_bytes(wrong);actual=array.array('h');actual.frombytes(decode(f));expected=[x+i for i,x in enumerate(actual)];rows['linearEditOnOrder1WrongSamples']=sum(x!=y for x,y in zip(actual,expected));assert rows['linearEditOnOrder1WrongSamples']==n-1
else:
 result=subprocess.run(['flac','-a','-f','-o',str(p/'ordinary-reference-analysis.txt'),str(p/'reference.flac')],capture_output=True);assert result.returncode==0;text=(p/'ordinary-reference-analysis.txt').read_text();assert 'type=LPC\torder=7' in text and 'quantization_level=13'in text;rows['ordinaryEncoderOpportunityAudit']={'files':1,'LPCSubframes':1,'admittedEquivalentFixed':0,'observed':'order7,shift13,non-binomialcoefficients','scope':'One ordinary encoding of same authored PCM, not a prevalence estimate'}
(p/'additional-controls.json').write_text(json.dumps(rows,indent=2))
with(p/'commands.log').open('a')as f:f.write('python3 research/shared/tooling/audio-stage-probes/flac_predictive_controls.py '+str(p)+'\n')
print(rows)

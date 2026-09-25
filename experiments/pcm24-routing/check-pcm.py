# SPDX-License-Identifier: Apache-2.0
import json,struct
from pathlib import Path
r=json.loads(Path('results/pcm24-routing/fidelity.json').read_text())[0]
b=Path('build/pcm24-routing/reference.f32').read_bytes();ref=struct.unpack('<%df'%(len(b)//4),b)
errors=[];samples=0;lowbits=0
for block in r['captures']:
    start=round(block['time']*block['sampleRate'])
    for c,channel in enumerate(block['samples']):
        for i,value in enumerate(channel):
            expected=ref[(start+i)*2+c];samples+=1
            if round(expected*8388608)%256:lowbits+=1
            if value!=expected:errors.append(abs(value-expected))
result={'route':r['state']['plan'],'blocks':len(r['captures']),'comparedChannelSamples':samples,'samplesWithNonzeroLow8Bits':lowbits,'mismatches':len(errors),'maximumError':max(errors,default=0),'passed':samples>90000 and not errors,'scope':'48kHz stereo rate-1 worklet output before device mixer, fixture interval 0.5 to 1.5 seconds; no physical-output claim'}
Path('results/pcm24-routing/pcm-comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

# SPDX-License-Identifier: Apache-2.0
import json,struct
from pathlib import Path
raw=Path('build/pcm24-routing/reference.f32').read_bytes();ref=struct.unpack('<%df'%(len(raw)//4),raw)
rows=[]
for r in json.loads(Path('results/pcm24-routing/browser-audio.json').read_text()):
    row={'arm':r['arm']};rows.append(row)
    if 'error' in r:row['error']=r['error'];continue
    channels=[[],[]]
    for block in r['captures']:
        for c in range(min(2,len(block))):channels[c].extend(block[c])
    # Skip the startup ramp and seek a nonperiodic 64-frame exact signature.
    found=None
    for start in range(24000,26000,128):
        signature=tuple(channels[0][start:start+64])
        if not any(signature):continue
        for at in range(max(0,start-20000),start+20000):
            if ref[at*2]==signature[0] and ref[at*2:(at+64)*2:2]==signature:
                found=(start,at);break
        if found:break
    if not found:row.update(passed=False,reason='No exact signature alignment');continue
    start,at=found;n=min(48000,len(channels[0])-start);errors=0;maximum=0
    for i in range(n):
        for c in range(2):
            delta=abs(channels[c][start+i]-ref[(at+i)*2+c]);errors+=delta!=0;maximum=max(maximum,delta)
    row.update(passed=n>=40000 and errors==0,comparedChannelSamples=n*2,mismatches=errors,maximumError=maximum,captureStartFrame=start,referenceStartFrame=at,scope='Rate-1 browser media-element output tapped at 48kHz before device mixer')
Path('results/pcm24-routing/browser-pcm-comparison.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(rows,indent=2))

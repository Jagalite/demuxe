# SPDX-License-Identifier: Apache-2.0
"""Finite TS packet fixtures. Requires decoder-family-fixtures.py; outputs build/."""
import json,pathlib,subprocess
root=pathlib.Path('build/mpegts-fixtures');root.mkdir(parents=True,exist_ok=True)
source='build/codec-expansion/decoder-fixtures/alac-48000-2.mov'
cases=[]
for name,channels,bframes in [('stereo',2,0),('mono',1,0),('bframes',2,2)]:
 target=root/(name+'.ts')
 subprocess.run(['ffmpeg','-v','error','-y','-cpuflags','0','-i',source,'-c:v','libx264' if bframes else 'copy',*(['-bf',str(bframes)] if bframes else []),'-c:a','aac','-ar','48000','-ac',str(channels),'-f','mpegts',str(target)],check=True)
 cases.append({'id':name,'input':str(target),'channels':channels,'bframes':bframes})
(root/'fixtures.json').write_text(json.dumps(cases,indent=2)+'\n');print(len(cases),'MPEG TS fixtures generated')

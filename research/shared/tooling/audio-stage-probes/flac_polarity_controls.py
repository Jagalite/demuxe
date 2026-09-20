# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,struct,json,subprocess
from flac_bits import Bits,crc,header,stream
p=pathlib.Path(sys.argv[1]);N=257;WIDTH=21;COEF=[[],[1],[2,-1],[3,-3,1],[4,-6,4,-1]];tree=ast.parse(pathlib.Path(__file__).with_name('flac_residual_polarity.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['signed','make','invert']],type_ignores=[]),__file__,'exec'));data=(p/'source.flac').read_bytes();wrong=bytearray(data);size=8+(23+N*WIDTH+7)//8+2;wrong[50]=64;wrong[42+size-2:42+size]=struct.pack('>H',crc(wrong[42:42+size-2],16));rows={}
for name,raw in [('LPCvalidCRC',bytes(wrong)),('CRC',data[:-3]+bytes([data[-3]^1])+data[-2:]),('truncated',data[:-1])]:
 try:invert(raw);raise RuntimeError('invalid accepted')
 except ValueError as e:rows[name]=str(e)
try:make(0,0,[],[1<<20]);raise RuntimeError('overflow accepted')
except ValueError as e:rows['residualOverflow']=str(e)
r=subprocess.run(['flac','-t',str(p/'source.flac'),str(p/'reversed.flac')],capture_output=True);assert r.returncode==0;(p/'independent-flac-validation.txt').write_bytes(r.stdout+r.stderr);(p/'additional-controls.json').write_text(json.dumps(rows,indent=2))
with(p/'commands.log').open('a')as f:f.write('python3 research/shared/tooling/audio-stage-probes/flac_polarity_controls.py '+str(p)+'\nnode research/shared/tooling/audio-stage-probes/flac_polarity_browser.mjs '+str(p)+'\nflac -t '+str(p/'source.flac')+' '+str(p/'reversed.flac')+'\n')

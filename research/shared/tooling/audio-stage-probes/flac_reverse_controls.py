# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,struct,json,subprocess
from flac_bits import Bits,crc,header,stream
p=pathlib.Path(sys.argv[1]);N=257;WIDTH=17;tree=ast.parse(pathlib.Path(__file__).with_name('flac_residual_reverse.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['signed','make','transform']],type_ignores=[]),__file__,'exec'))
data=bytearray((p/'source.flac').read_bytes());size=8+(39+(N-1)*WIDTH+7)//8+2;data[50]=16;data[42+size-2:42+size]=struct.pack('>H',crc(data[42:42+size-2],16))
try:transform(bytes(data));raise RuntimeError('admitted wrong predictor')
except ValueError as e:reason=str(e);assert reason=='predictor'
try:make(0,0,[65536]+[0]*(N-2));raise RuntimeError('overflow')
except ValueError as e:assert str(e)=='residual overflow'
result=subprocess.run(['flac','-t',str(p/'source.flac'),str(p/'reversed.flac')],capture_output=True);assert result.returncode==0;(p/'independent-flac-validation.txt').write_bytes(result.stdout+result.stderr);(p/'additional-controls.json').write_text(json.dumps({'wrongPredictorWithValidCRCRejected':reason,'residualSignOverflowRejected':True,'independentLibFLACValid':True},indent=2))
with(p/'commands.log').open('a')as f:f.write('python3 research/shared/tooling/audio-stage-probes/flac_reverse_controls.py '+str(p)+'\nnode research/shared/tooling/audio-stage-probes/flac_reverse_browser.mjs '+str(p)+'\nflac -t '+str(p/'source.flac')+' '+str(p/'reversed.flac')+'\n')

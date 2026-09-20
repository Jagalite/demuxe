# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,array,math,ast
p=pathlib.Path(sys.argv[1]);mode=sys.argv[2]
if mode=='baseline':subprocess.run(['ffmpeg','-v','error','-y','-i',str(p/'source.ac3'),'-c:a','pcm_f32le',str(p/'reference.wav')],check=True)
else:
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'source.ac3'),'-f','f32le','-']);a=array.array('f');a.frombytes(raw);tree=ast.parse(pathlib.Path('research/shared/tooling/audio-stage-probes/quantized_flac.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='quant'],type_ignores=[]),'quant','exec'));(p/'quant.s32').write_bytes(quant(a).tobytes());subprocess.run(['ffmpeg','-v','error','-y','-f','s32le','-ar','48000','-ac','2','-i',str(p/'quant.s32'),'-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24',str(p/'quant.flac')],check=True)

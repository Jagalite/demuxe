# SPDX-License-Identifier: Apache-2.0
import sys,pathlib,subprocess,json,ast,copy
out=pathlib.Path(sys.argv[1]);source=pathlib.Path('results/top100/iamf/stereo.iamf');mode=sys.argv[2]
g=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_stream_groups','-of','json',str(source)]))['stream_groups']
tree=ast.parse(pathlib.Path('results/top100/iamf/validate.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='validate'],type_ignores=[]),'validate','exec'));validate(g)
wrong=copy.deepcopy(g);next(x for x in wrong[1]['components'][0]['subcomponents'] if 'nb_elements'in x)['default_mix_gain']='256/256'
try:validate(wrong);raise RuntimeError('unsupported gain accepted')
except AssertionError:pass
args=['ffmpeg','-v','error','-y','-i',str(source)]
if mode=='candidate':args+=['-map','0:a:0','-c:a','copy',str(out/'component.flac')]
else:args+=['-f','s16le',str(out/'reference.s16')]
subprocess.run(args,check=True)

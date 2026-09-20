# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import ast,json,hashlib,sys,subprocess
out=Path(sys.argv[1]);fixture=Path('research/items/R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline/evidence/20260919T223100Z-compatible-sources');tool=Path('research/items/R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline/tests/ordered.py');tree=ast.parse(tool.read_text());env={'Path':Path,'hashlib':hashlib};exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['vint','children','get','compile']],type_ignores=[]),str(tool),'exec'),env);b=(fixture/'ordered.mkv').read_bytes();auth=json.loads((fixture/'result.json').read_text())['authorized'];chap=b.rfind(bytes.fromhex('1043a770'));assert chap>0;controls={}
for name,needle,replacement in [('bounds',bytes.fromhex('92843b9aca00'),bytes.fromhex('9284b2d05e00')),('edition',bytes.fromhex('45bc814d'),bytes.fromhex('45bc814e'))]:
 tail=b[chap:];assert needle in tail;bad=b[:chap]+tail.replace(needle,replacement,1)
 try:env['compile'](bad,auth);raise RuntimeError('accepted')
 except AssertionError as e:controls[name]='rejected '+str(e)
streams=[]
for name in ['a','b']:
 j=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_data_hash','sha256','-of','json',str(fixture/(name+'.mkv'))]));streams.append([{k:s.get(k) for k in ['codec_name','codec_type','width','height','sample_rate','channels','extradata_hash']} for s in j['streams']])
assert streams[0]==streams[1];controls['selectedConfigurationsExact']=streams[0];(out/'controls.json').write_text(json.dumps(controls,indent=2))

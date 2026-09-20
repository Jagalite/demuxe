# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,json,hashlib,struct
sys.path.insert(0,'/tmp/demuxe-audio-numeric')
import numpy as np,OpenEXR
W=H=128
code=pathlib.Path(__file__).with_name('deep_exr_roi.py');tree=ast.parse(code.read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='read'],type_ignores=[]),str(code),'exec'))
p=pathlib.Path(sys.argv[1]);ids=json.loads((p/'results.json').read_text())['sourceIDs'];offsets=[0];samples=[]
for frame in range(3):
 ch=read(p/f'frame{frame}.exr',ids[frame])
 for y in range(H):
  for x in range(W):
   for i in range(len(ch['A'][y,x])):samples.append([ch[k][y,x][i]for k in 'RGBA'])
   offsets.append(len(samples))
a=np.array(offsets,np.uint32).tobytes();b=np.array(samples,np.float32).tobytes();sys.stdout.buffer.write(struct.pack('<I',len(a))+a+b)

# SPDX-License-Identifier: Apache-2.0
import sys,pathlib,ast,json,hashlib
sys.path.insert(0,'/tmp/demuxe-audio-numeric')
import numpy as np,OpenEXR
W=H=128;p=pathlib.Path(sys.argv[1]);tree=ast.parse(pathlib.Path(__file__).with_name('deep_exr_roi.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)],type_ignores=[]),__file__,'exec'));ids=json.loads((p/'results.json').read_text())['sourceIDs'];ch=read(p/'frame0.exr',ids[0]);controls={}
try:read(p/'frame0.exr','wrong');controls['wrongIdentity']=False
except ValueError:controls['wrongIdentity']=True
for kind in ['depth','alpha']:
 bad={k:v.copy()for k,v in ch.items()}
 if kind=='depth':bad['Z'][0,1]=bad['Z'][0,1][::-1].copy()
 else:bad['A'][0,1]=np.full(len(bad['A'][0,1]),1.5,np.float32)
 path=p/(kind+'-invalid.exr');OpenEXR.File({'type':OpenEXR.deepscanline,'compression':OpenEXR.ZIPS_COMPRESSION},bad).write(str(path))
 try:read(path,hashlib.sha256(path.read_bytes()).hexdigest());controls[kind]=False
 except ValueError:controls[kind]=True
other=read(p/'frame1.exr',ids[1]);controls['wrongFrameDiffers']=not np.array_equal(composite(ch,17,21),composite(other,17,21));assert all(controls.values());(p/'controls.json').write_text(json.dumps(controls,indent=2));print(controls)

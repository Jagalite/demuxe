# SPDX-License-Identifier: Apache-2.0
"""Run correctness and bounded kernel timings. Not an end-to-end codec benchmark."""
from pathlib import Path
import subprocess,json,statistics,tempfile,ctypes
import numpy as np
R=Path(__file__).resolve().parents[1];src=R/'scripts/boundary_kernel.c'
results={'scope':'Only 4x4 already-dequantized inverse-transform residual arithmetic. Full comparator is our own C kernel, not FFmpeg SIMD. Does not validate bitstream decoding, intra predictions, spatial quality or a full thumbnail provider.','builds':{}}
with tempfile.TemporaryDirectory() as d:
 for name,flags in [('O3_native',['-O3','-march=native']),('O3_no_vectorize',['-O3','-fno-tree-vectorize']),('undefined_sanitizer',['-O1','-fsanitize=undefined','-fno-sanitize-recover=all'])]:
  exe=str(Path(d)/name);cmd=['gcc','-std=c11',*flags,str(src),'-o',exe]
  subprocess.run(cmd,check=True,capture_output=True,timeout=30)
  run=subprocess.run([exe]+(['--check-only'] if name=='undefined_sanitizer' else []),check=True,capture_output=True,timeout=40)
  row=json.loads(run.stdout);row['build']=cmd;row['stderr']=run.stderr.decode()
  if row['trials']:
   row['full_ms_median']=statistics.median(t['full_ms'] for t in row['trials'])
   row['boundary_ms_median']=statistics.median(t['boundary_ms'] for t in row['trials'])
   row['speedup_ratio']=row['full_ms_median']/row['boundary_ms_median']
  results['builds'][name]=row
 # Independent numpy separable-transform oracle, shared C library outputs for 1000 cases.
 libpath=str(Path(d)/'kernel.so')
 subprocess.run(['gcc','-O2','-shared','-fPIC',str(src),'-o',libpath],check=True,capture_output=True,timeout=30)
 lib=ctypes.CDLL(libpath);ptr=ctypes.POINTER(ctypes.c_int32)
 for fun in [lib.full,lib.boundary]:fun.argtypes=[ptr,ptr];fun.restype=None
 def oracle(a):
  def transform_axis(a,axis):
   a=np.moveaxis(a,axis,0)
   e0=a[0]+a[2];e1=a[0]-a[2];o0=(a[1]//2)-a[3];o1=a[1]+(a[3]//2)
   return np.moveaxis(np.stack([e0+o1,e1+o0,e1-o0,e0-o1]),0,axis)
  return (transform_axis(transform_axis(a.astype(np.int64),0),1)+32)//64
 keep=[3,7,11,12,13,14,15];rng=np.random.default_rng(807)
 for i in range(1000):
  a=rng.integers(-32768,32768,(4,4),dtype=np.int32);out=np.zeros(16,np.int32);ref=oracle(a).ravel()
  lib.full(a.ctypes.data_as(ptr),out.ctypes.data_as(ptr));assert np.array_equal(out,ref)
  lib.boundary(a.ctypes.data_as(ptr),out.ctypes.data_as(ptr));assert np.array_equal(out[keep],ref[keep])
 results['independent_numpy_oracle']={'cases':1000,'mismatches':0}
(R/'results/kernel_bench.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))

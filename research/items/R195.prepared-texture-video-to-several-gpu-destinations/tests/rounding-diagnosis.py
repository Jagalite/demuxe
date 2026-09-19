# SPDX-License-Identifier: Apache-2.0
import pathlib,json,sys,struct
out=pathlib.Path(sys.argv[1]);inputs=json.load(open(out/'gpu-input.json'));results=json.load(open(out/'results.json'));rows=[]
def rgb(v):return [(v>>11)*255/31,((v>>5)&63)*255/63,(v&31)*255/31]
for result in results['probe']['rows']:
 src=next(x for x in inputs if x['format']==result['format'] and x['frame']==result['frame']);size=8 if src['format'].startswith('bc1') else 16;pixels=[0]*1024
 for block in range(16):
  p=block*size+(size-8);a,b,bits=struct.unpack_from('<HHI',bytes(src['blocks']),p);c0,c1=rgb(a),rgb(b);assert a>=b
  palette=[c0,c1,[(2*x+y)/3 for x,y in zip(c0,c1)],[(x+2*y)/3 for x,y in zip(c0,c1)]]
  # Fixture alpha is opaque; validate actual BC3 endpoints before using 255.
  if size==16:assert src['blocks'][block*size: block*size+2]==[255,255]
  for j in range(16):
   x=(block%4)*4+j%4;y=(block//4)*4+j//4;value=palette[(bits>>(2*j))&3];pixels[(y*16+x)*4:(y*16+x)*4+4]=[int(v+.5) for v in value]+[255]
 errors=[abs(a-b) for a,b in zip(pixels,result['rgba'])];rows.append({'format':src['format'],'frame':src['frame'],'independentNormalizedRoundNearestExact':max(errors)==0,'maxError':max(errors),'nativeIntegerFloorDifferenceMax':result['maxError']})
summary={'rows':rows,'diagnosis':'Native BC1 PNG expansion floors interpolation (2), GPU rounds interpolation (3) for green block endpoint values 8 and 0. Independent normalized endpoint/interpolation with nearest rounding predicts GPU output. Original exact-native-PNG criterion is retained as failed; this diagnostic does not silently change acceptance. Choose an explicit codec reconstruction precision contract before full correctness acceptance.'}
(out/'rounding-diagnosis.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))

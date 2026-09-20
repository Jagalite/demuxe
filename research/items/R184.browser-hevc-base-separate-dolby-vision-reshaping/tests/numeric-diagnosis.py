# SPDX-License-Identifier: Apache-2.0
import pathlib,json,sys,numpy as np
p=pathlib.Path('research/shared/runs/20260920T005243Z-dovi-profile5');ref=pathlib.Path('research/shared/runs/20260920T010000Z-libplacebo-reference');o=pathlib.Path(sys.argv[1]);m=json.loads((ref/'frame0-effective.json').read_text());W,H=1920,1080;raw=np.fromfile(p/'base-0.yuv10',np.uint16);Y=raw[:W*H].reshape(H,W).astype(float)/1023;U=raw[W*H:W*H*5//4].reshape(H//2,W//2).astype(float)/1023;V=raw[W*H*5//4:].reshape(H//2,W//2).astype(float)/1023;y,x=np.indices((H,W));cx=x/2;cy=y/2-.25;ix=np.floor(cx).astype(int);iy=np.floor(cy).astype(int);fx=cx-ix;fy=cy-iy
sample=lambda q:sum(q[np.clip(iy+dy,0,H//2-1),np.clip(ix+dx,0,W//2-1)]*(fx if dx else 1-fx)*(fy if dy else 1-fy)for dy in [0,1]for dx in [0,1]);base=np.stack([Y,sample(U),sample(V)],axis=2)
def transform(a,dtype):
 a=np.asarray(a,dtype=dtype);b=np.empty_like(a)
 for c,comp in enumerate(m['components']):
  s=np.clip(a[:,:,c],0,1);idx=np.searchsorted(np.asarray(comp['pivots'][1:-1],dtype=dtype),s,side='right');coef=np.asarray(comp['poly'],dtype=dtype)[idx];b[:,:,c]=np.clip((coef[:,:,2]*s+coef[:,:,1])*s+coef[:,:,0],comp['pivots'][0],comp['pivots'][-1])
 matrix=np.asarray(m['effectiveNonlinearMatrix'],dtype=dtype).reshape(3,3);bias=np.asarray(m['effectiveNonlinearBias'],dtype=dtype);linear=np.asarray([[3.06441879,-2.16597676,.10155818],[-.65612108,1.78554118,-.12943749],[.01736321,-.04725154,1.03004253]],dtype=dtype)@np.asarray(m['linear'],dtype=dtype).reshape(3,3)
 b=b@matrix.T+bias;v=np.maximum(b,0)**(1/78.84375);v=(np.maximum(v-.8359375,0)/(18.8515625-18.6875*v))**(1/.1593017578125);v=np.maximum(v@linear.T,0)**.1593017578125;return((.8359375+18.8515625*v)/(1+18.6875*v))**78.84375
oracle=np.fromfile(ref/'frame0-dovi.rgba32f',np.float32).reshape(H,W,4)[:,:,:3];results={}
def stats(a,b):
 d=np.abs(a-b);return {'mean':float(d.mean()),'max':float(d.max()),'p99':float(np.quantile(d,.99)),'over2codes':int(np.count_nonzero(d>2/1023))}
for name,arr in [('hostFloat64',transform(base,np.float64)),('hostFloat32',transform(base,np.float32))]:results[name]=stats(arr,oracle)
if (o/'raw-sampled.rgba32f').exists():
 sampled=np.fromfile(o/'raw-sampled.rgba32f',np.float32).reshape(H,W,4)[:,:,:3];results['rawSampleVsBilinear']=[stats(sampled[:,:,c],base[:,:,c]) for c in range(3)];results['sampledFloat64']=stats(transform(sampled,np.float64),oracle);results['sampledFloat32']=stats(transform(sampled,np.float32),oracle)
(o/'numeric-diagnosis.json').write_text(json.dumps(results,indent=2));print(results)

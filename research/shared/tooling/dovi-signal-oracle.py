# SPDX-License-Identifier: Apache-2.0
import pathlib,json,sys,numpy as np
p=pathlib.Path(sys.argv[1]);ref=pathlib.Path(sys.argv[2]);p.joinpath('signal-protocol.json').write_text(json.dumps({'contract':'Fullfirst1920x1080picture separate polynomial/matrix/PQ transform toBT2020PQfloat; maxRGB2/1023 versus independentlyexecutedlibplacebo. Host10bitinputdiagnostic isolates math/upsampling from opaque nativeGPUExternalTexture access. NotphysicalHDRappearance. No tolerance relaxation.','candidateInput':'GPUExternalTexture srgb float output; invert reportedBT709limited YCbCr semantics including sourceBT709/outputSRGB transfer.'},indent=2))
m=json.loads((ref/'frame0-effective.json').read_text());raw=np.fromfile(p/'base-0.yuv10',np.uint16);W,H=1920,1080;Y=raw[:W*H].reshape(H,W).astype(float)/1023;U=raw[W*H:W*H*5//4].reshape(H//2,W//2).astype(float)/1023;V=raw[W*H*5//4:].reshape(H//2,W//2).astype(float)/1023
# Chroma location is left; centered vertically relative to luma samples.
y,x=np.indices((H,W));cx=x/2;cy=y/2-.25
ix=np.floor(cx).astype(int);iy=np.floor(cy).astype(int);fx=cx-ix;fy=cy-iy
sample=lambda q:sum(q[np.clip(iy+dy,0,H//2-1),np.clip(ix+dx,0,W//2-1)]*(fx if dx else 1-fx)*(fy if dy else 1-fy)for dy in [0,1]for dx in [0,1])
base=np.stack([Y,sample(U),sample(V)],axis=2);matrix=np.array(m['nonlinear']).reshape(3,3);bias=np.array(m['effectiveNonlinearBias']);linear=np.array([[3.06441879,-2.16597676,.10155818],[-.65612108,1.78554118,-.12943749],[.01736321,-.04725154,1.03004253]])@np.array(m['linear']).reshape(3,3)
def transform(a,identity=False):
 b=np.empty_like(a)
 for c,comp in enumerate(m['components']):
  s=np.clip(a[:,:,c],0,1);idx=np.searchsorted(comp['pivots'][1:-1],s,side='right');coeff=np.array(comp['poly'])[idx];b[:,:,c]=s if identity else np.clip((coeff[:,:,2]*s+coeff[:,:,1])*s+coeff[:,:,0],comp['pivots'][0],comp['pivots'][-1])
 b=b@matrix.T+bias;v=np.maximum(b,0)**(1/78.84375);v=(np.maximum(v-.8359375,0)/(18.8515625-18.6875*v))**(1/.1593017578125);v=np.maximum(v@linear.T,0)**.1593017578125;return((.8359375+18.8515625*v)/(1+18.6875*v))**78.84375
native=np.fromfile(p/'external.rgba32f',np.float32).reshape(H,W,4)[:,:,:3].astype(float);light=np.where(native<=.04045,native/12.92,((np.maximum(native,0)+.055)/1.055)**2.4);bt=np.where(light<.018,light*4.5,1.099*np.maximum(light,0)**.45-.099);rgb2yuv=np.array([[.2126,.7152,.0722],[-.2126/1.8556,-.7152/1.8556,.5],[.5,-.7152/1.5748,-.0722/1.5748]]);decoded=bt@rgb2yuv.T;decoded[:,:,0]=decoded[:,:,0]*876/1023+64/1023;decoded[:,:,1:]=decoded[:,:,1:]*896/1023+512/1023
oracle=np.fromfile(ref/'frame0-dovi.rgba32f',np.float32).reshape(H,W,4)[:,:,:3];results={}
for name,data in [('hostInput',transform(base)),('nativeExternalInput',transform(decoded)),('identityCurveNegative',transform(base,True))]:
 err=np.abs(data-oracle);results[name]={'maxError':float(err.max()),'meanError':float(err.mean()),'overBudget':int(np.count_nonzero(err>2/1023)),'passed':bool(np.all(err<=2/1023)),'finite':bool(np.all(np.isfinite(data)))};np.array(data,np.float32).tofile(p/(name+'.rgb32f'))
results['inputYError']={'mean':float(np.mean(abs(decoded[:,:,0]-Y))),'max':float(np.max(abs(decoded[:,:,0]-Y)))};(p/'signal-results.json').write_text(json.dumps(results,indent=2)+'\n');print(results)

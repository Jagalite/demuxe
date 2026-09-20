# SPDX-License-Identifier: Apache-2.0
import pathlib,numpy as np,json
p=pathlib.Path('research/shared/runs/20260920T005243Z-dovi-profile5');o=pathlib.Path('research/shared/runs/20260920T011000Z-dovi-access-diagnosis');a=np.fromfile(p/'external.rgba32f',np.float32).reshape(1080,1920,4)[:,:,:3];raw=np.fromfile(p/'base-0.yuv10',np.uint16);y=raw[:1080*1920].reshape(1080,1920)/1023
srgblinear=np.where(a<=.04045,a/12.92,((np.maximum(a,0)+.055)/1.055)**2.4);bt709=lambda v:np.where(v<.018,v*4.5,1.099*np.maximum(v,0)**.45-.099)
rs={}
for name,rgb in [('direct_encoded',a),('srgb_to_bt709',bt709(srgblinear)),('linear_to_bt709',bt709(a))]:
 Y=rgb@np.array([.2126,.7152,.0722])
 for range_,pred in [('full',Y),('limited',Y*876/1023+64/1023)]:
  err=np.abs(pred-y);rs[name+'_'+range_]={'mean':float(err.mean()),'max':float(err.max()),'p99':float(np.quantile(err,.99))}
rs['externalRGBRange']=[float(a.min()),float(a.max())];(o/'nominal-interpretations.json').write_text(json.dumps(rs,indent=2));print(rs)

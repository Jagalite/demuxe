# SPDX-License-Identifier: Apache-2.0
"""Separate prepared-asset quality control. Preparation excluded and explicit.
Adds a pixel-exact PNG at thumbnail size so the authored comparison does not
hide the visible loss from the earlier small JPEG quality-85/subsampled fixture.
"""
from pathlib import Path
import io,json,time,statistics,random,hashlib
from PIL import Image
import numpy as np
from skimage.metrics import structural_similarity
R=Path(__file__).resolve().parents[1];F=R/'fixtures';O=R/'results'
result=[]
for name in ['chart4k','texture4k']:
 with Image.open(F/(name+'.jpg')) as im:ref=im.resize((240,135),Image.Resampling.LANCZOS)
 targets={'png_exact':F/(name+'_thumb.png'),'jpeg_q95_444':F/(name+'_thumb_q95.jpg')}
 ref.save(targets['png_exact']);ref.save(targets['jpeg_q95_444'],quality=95,subsampling=0)
 data={k:p.read_bytes() for k,p in targets.items()};trials={k:[] for k in targets};outs={}
 for i in range(21):
  order=list(targets);random.Random(556+i).shuffle(order)
  for k in order:
   t=time.perf_counter()
   with Image.open(io.BytesIO(data[k])) as im:im.load();out=im.tobytes()
   if i:trials[k].append((time.perf_counter()-t)*1000)
   outs[k]=out
 for k in targets:
  a=np.frombuffer(outs[k],np.uint8).reshape(135,240,3)
  result.append({'fixture':name,'method':k,'encoded_bytes':len(data[k]),'decode_ms_median':statistics.median(trials[k]),'same_pixels_as_full_jpeg_then_resize':outs[k]==ref.tobytes(),'ssim':float(structural_similarity(a,np.array(ref),data_range=255,channel_axis=2)),'sha256':hashlib.sha256(data[k]).hexdigest(),'raw_ms':trials[k]})
 ref.close()
(O/'authored_control.json').write_text(json.dumps({'scope':'Prepared thumbnail, not source-video extraction. Generation/storage/transfer excluded. 1 warmup+20 seeded randomized native in-memory decode trials.','summary':result},indent=2));print(json.dumps([{k:v for k,v in r.items() if k!='raw_ms'} for r in result],indent=2))

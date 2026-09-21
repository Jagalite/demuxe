# SPDX-License-Identifier: Apache-2.0
"""Two-pass progressive JPEG proof; native only, no streamed network measured."""
from pathlib import Path
import subprocess,tempfile,json,statistics,random,hashlib,math
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity
R=Path(__file__).resolve().parents[1];F=R/'fixtures';O=R/'results'
raw={};payload={}
with tempfile.TemporaryDirectory() as d:
 exe=str(Path(d)/'progressive_jpeg');build=['gcc','-O3','-std=c11',str(R/'scripts/progressive_jpeg.c'),'-ljpeg','-o',exe]
 subprocess.run(build,check=True,capture_output=True,timeout=30)
 variants=[(name,method) for name in ['chart4k','texture4k'] for method in ['progressive','final']]
 for round in range(11):
  order=variants.copy();random.Random(788+round).shuffle(order)
  for name,method in order:
   first=Path(d)/'first.rgb';last=Path(d)/'last.rgb'
   p=subprocess.run([exe,str(F/f'{name}_progressive.jpg'),method,str(first),str(last)],check=True,capture_output=True,timeout=30)
   row=json.loads(p.stdout);row.update(round=round,warmup=round==0)
   k=name+':'+method;raw.setdefault(k,[]).append(row)
   payload[k]=(first.read_bytes(),last.read_bytes())
summary=[]
for k,rows in raw.items():
 name,method=k.split(':');shape=(rows[0]['height'],rows[0]['width'],3)
 first,last=payload[k];ref=payload[name+':final'][1]
 def shrink(b):return np.array(Image.fromarray(np.frombuffer(b,np.uint8).reshape(shape)).resize((240,135),Image.Resampling.LANCZOS))
 a,b=shrink(first),shrink(ref);mse=float(np.mean((a.astype(float)-b.astype(float))**2))
 Image.fromarray(a).save(O/f'{name}_{method}_first.png');Image.fromarray(shrink(last)).save(O/f'{name}_{method}_last.png')
 summary.append({'fixture':name,'method':method,'first_ms_median':statistics.median(r['first_ms'] for r in rows[1:]),'total_ms_median':statistics.median(r['total_ms'] for r in rows[1:]),'first_bytes_consumed':rows[0]['first_bytes_consumed'],'source_bytes':rows[0]['total_source_bytes'],'first_scan':rows[0]['first_scan'],'last_scan':rows[0]['last_scan'],'dimensions':[shape[1],shape[0]],'first_psnr_to_final_at_240x135':100 if mse==0 else 10*math.log10(255**2/mse),'first_ssim_to_final_at_240x135':float(structural_similarity(a,b,data_range=255,channel_axis=2)),'final_byte_identical_to_single_pass':last==ref,'first_sha256':hashlib.sha256(first).hexdigest(),'final_sha256':hashlib.sha256(last).hexdigest()})
result={'scope':'Existing progressive JPEG, first scan then final using the same libjpeg coefficient buffer. 1 warmup + 10 randomized trials. Timed inside native process: header/decode/output buffer, excluding process startup, source-file read and final 480x270->240x135 analysis resizing. Full source in memory; consumed bytes are logical decoder cursor, NOT HTTP traffic. Compare each method at same 480x270 decoded dimensions. No browser test. Buffered mode can retain full-resolution coefficient storage.','build':build,'summary':summary,'raw':raw}
(O/'progressive_bench.json').write_text(json.dumps(result,indent=2));print(json.dumps(summary,indent=2))

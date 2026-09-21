from common import *
from rle_png import transcode_rows
from PIL import Image
import io,numpy as np
palette=[(0,0,0,0),(255,255,255,255),(0,0,0,128),(255,0,0,255)]
results={}
for name,w,h in [('glyphs',320,96),('sparse_hd',1920,128),('noisy',73,17)]:
 rle=(F/f'rle_{name}.bin').read_bytes();candidate,meta=transcode_rows(rle,w,h,palette);(F/f'rle_{name}_row_reuse.png').write_bytes(candidate)
 ref=(F/f'rle_{name}_reference.png').read_bytes();a=np.asarray(Image.open(io.BytesIO(candidate)).convert('RGBA'));b=np.asarray(Image.open(io.BytesIO(ref)).convert('RGBA'))
 meta.update({'host_rgba_exact':bool(np.array_equal(a,b)),'reference_png_bytes':len(ref),'ratio_to_reference':len(candidate)/len(ref),'first_variant_bytes':len((F/f'rle_{name}_candidate.png').read_bytes())})
 meta['controls']={'truncated':reject(lambda:transcode_rows(rle[:-1],w,h,palette)),'overflow':reject(lambda:transcode_rows(rle,w-1,h,palette)),'palette':reject(lambda:transcode_rows(rle,w,h,palette[:2])),'cap':reject(lambda:transcode_rows(rle,w,h,palette,max_pixels=100))}
 results[name]=meta
save('rle_row_reuse.json',results);print(json.dumps(results,indent=2))

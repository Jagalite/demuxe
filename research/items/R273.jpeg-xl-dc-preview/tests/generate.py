# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys
r=Path(sys.argv[1]);w,h=1024,768;data=bytearray()
for y in range(h):
 for x in range(w):
  rgb=[x*255//(w-1),y*255//(h-1),(x+y)*255//(w+h-2)]
  if 180<x<420 and 150<y<520:rgb=[220,40,80]
  if (x-720)**2+(y-350)**2<140**2:rgb=[40,210,120]
  if x%127<2 or y%127<2:rgb=[235]*3
  data.extend(rgb)
(r/'input.ppm').write_bytes(f'P6\n{w} {h}\n255\n'.encode()+data)

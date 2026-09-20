# SPDX-License-Identifier: Apache-2.0
import av,pathlib,sys
p=pathlib.Path(sys.argv[1]);c=av.CodecContext.create('zmbv','r');c.width=64;c.height=64
with(p/'native.bgr0').open('wb')as f:
 for q in sorted(p.glob('*.packet')):
  frames=c.decode(av.Packet(q.read_bytes()))
  for frame in frames:
   plane=frame.planes[0];b=bytes(plane)
   for y in range(64):f.write(b[y*plane.line_size:y*plane.line_size+256])
 c.decode(None)

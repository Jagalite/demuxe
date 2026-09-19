# SPDX-License-Identifier: Apache-2.0
import pathlib,struct,zlib,sys
p=pathlib.Path(sys.argv[1])
def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b))
for n in range(2):
 colors=[(255,0,0),(0,255,0),(0,0,255),(255,255,255)]
 raw=b''.join(b'\0'+b''.join(bytes(colors[((y//8)*2+x//8+n)%4]) for x in range(16)) for y in range(16))
 png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>2I5B',16,16,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
 (p/f'frame{n}.png').write_bytes(png)

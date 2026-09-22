# SPDX-License-Identifier: Apache-2.0
"""Original marked PGS bitmap; adapted from the repository's Apache-2.0 R198 PGS generator."""
from pathlib import Path


def write_pgs(path: Path, duration=36):
    be = lambda n, size: n.to_bytes(size, 'big')
    def segment(pts, kind, body):
        return b'PG' + be(pts,4) + be(pts,4) + bytes([kind]) + be(len(body),2) + body
    def composition(number, count):
        return (be(320,2)+be(180,2)+bytes([0x10])+be(number,2)+bytes([0x80 if number==0 else 0,0,0,count])
                +(be(0,2)+bytes([0,0])+be(220,2)+be(130,2) if count else b''))
    rle = (bytes([1])*70 + bytes([0,0]))*30
    obj = be(0,2)+bytes([0,0xc0])+be(len(rle)+4,3)+be(70,2)+be(30,2)+rle
    palette=bytes([0,0,0,16,128,128,0,1,106,222,202,255])
    window=bytes([1,0])+be(0,2)+be(0,2)+be(320,2)+be(180,2)
    entries=[(45000,0x16,composition(0,1)),(45000,0x17,window),(45000,0x14,palette),
             (45000,0x15,obj),(45000,0x80,b''),(round((duration-.2)*90000),0x16,composition(1,0)),
             (round((duration-.2)*90000),0x80,b'')]
    path.write_bytes(b''.join(segment(*entry) for entry in entries))

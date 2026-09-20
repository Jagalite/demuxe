# SPDX-License-Identifier: Apache-2.0
"""Author or verify an immutable fragmented-MP4 decode-epoch shift."""
import argparse
import json
from pathlib import Path
import struct
import subprocess

p = argparse.ArgumentParser()
p.add_argument('source', type=Path)
p.add_argument('output', type=Path)
p.add_argument('seconds', type=int)
p.add_argument('--verify', action='store_true')
a = p.parse_args()
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(a.source)]))
scale = int(probe['streams'][0]['time_base'].split('/')[1])
data = bytearray(a.source.read_bytes())
patches = []

def visit(start, end):
    at = start
    while at < end:
        size = struct.unpack_from('>I', data, at)[0]
        kind = bytes(data[at + 4:at + 8])
        assert size >= 8 and at + size <= end
        if kind in (b'moof', b'traf'):
            visit(at + 8, at + size)
        if kind == b'tfdt':
            width = 8 if data[at + 8] else 4
            pos = at + 12
            old = int.from_bytes(data[pos:pos + width], 'big')
            new = old + a.seconds * scale
            data[pos:pos + width] = new.to_bytes(width, 'big')
            patches.append({'offset': pos, 'old': old, 'new': new})
        at += size

visit(0, len(data))
assert patches
if a.verify:
    assert a.output.read_bytes() == data, 'epoch fixture differs from declared transform'
else:
    with a.output.open('xb') as stream:
        stream.write(data)
print(json.dumps({'verified': a.verify, 'patches': patches, 'timescale': scale}))

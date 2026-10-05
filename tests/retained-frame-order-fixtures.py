#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate small AVC ordering fixtures; optional argument selects output directory."""
import json
from pathlib import Path
import re
import subprocess
import sys

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'build/retained-order-candidate')
out.mkdir(parents=True, exist_ok=True)


def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', *map(str, args)], check=True)


video = ['-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=24']
audio = ['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000']
for name, profile, count, extra in [('h264-no-b', 'main', '0', []), ('h264-deep-b', 'high', '8', ['-x264-params', 'b-adapt=0:ref=8'])]:
    ffmpeg(*video, *audio, '-t', '8', '-c:v', 'libx264', '-profile:v', profile, '-bf', count, '-g', '24' if count == '0' else '48', *extra, '-c:a', 'ac3', '-y', out / (name + '.mkv'))

# A level-4 Main SPS without VUI infers the conservative 16-frame DPB. Rewrite
# only VUI and the RBSP stop bit; this fixture has no B frames/scaling matrices.
ffmpeg(*video, '-t', '8', '-c:v', 'libx264', '-profile:v', 'main', '-level:v', '4.0', '-bf', '0', '-g', '24', '-f', 'h264', '-y', out / 'no-vui-input.h264')
source = (out / 'no-vui-input.h264').read_bytes()
starts = list(re.finditer(b'\x00\x00\x00?\x01', source))
result = bytearray()
for index, marker in enumerate(starts):
    nal = source[marker.end():starts[index + 1].start() if index + 1 < len(starts) else len(source)]
    if nal[0] & 31 == 7:
        raw = nal[1:].replace(b'\x00\x00\x03', b'\x00\x00')
        bits = ''.join(f'{byte:08b}' for byte in raw)
        offset = 24

        def read(count):
            global offset
            value = int(bits[offset:offset + count], 2)
            offset += count
            return value

        def ue():
            zeros = 0
            while read(1) == 0:
                zeros += 1
            return 2 ** zeros - 1 + (read(zeros) if zeros else 0)

        assert raw[0] == 77
        ue(); ue()
        poc = ue()
        if poc == 0:
            ue()
        elif poc == 1:
            read(1); ue(); ue()
            for _ in range(ue()):
                ue()
        ue(); read(1); ue(); ue()
        if not read(1):
            read(1)
        read(1)
        if read(1):
            for _ in range(4):
                ue()
        rewritten = bits[:offset] + '01'
        rewritten = rewritten.ljust((len(rewritten) + 7) // 8 * 8, '0')
        escaped, zeros = bytearray(), 0
        for pos in range(0, len(rewritten), 8):
            byte = int(rewritten[pos:pos + 8], 2)
            if zeros == 2 and byte <= 3:
                escaped.append(3)
                zeros = 0
            escaped.append(byte)
            zeros = zeros + 1 if byte == 0 else 0
        nal = nal[:1] + escaped
    result += b'\x00\x00\x00\x01' + nal
(out / 'no-vui.h264').write_bytes(result)
# Raw H.264 parsing loses timing without VUI. Assign a packet clock explicitly;
# otherwise ffmpeg can repeat timestamps after the first IDR interval.
ffmpeg('-framerate', '24', '-i', out / 'no-vui.h264', *audio, '-t', '8', '-c:v', 'copy', '-bsf:v', 'setts=pts=N/(24*TB):dts=N/(24*TB):duration=1/(24*TB)', '-c:a', 'ac3', '-y', out / 'h264-no-vui.mkv')
for name in ['h264-no-b.mkv', 'h264-deep-b.mkv', 'h264-no-vui.mkv']:
    file = out / name
    report = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'json', str(file)]))
    pts = [float(packet['pts_time']) for packet in report['packets']]
    assert len(pts) == len(set(pts)) == 192 and max(pts) > 7.9, file
print(out)

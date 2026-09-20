# SPDX-License-Identifier: Apache-2.0
"""Create a finite, source-bound two-configuration Matroska seek fixture."""
from pathlib import Path
import hashlib
import json
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/20260919T221400Z-cue-codec-state'
OUT.mkdir(exist_ok=True)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def vint(value):
    width = next(n for n in range(1, 9) if value < (1 << (7 * n)) - 1)
    return (value | (1 << (7 * width))).to_bytes(width, 'big')

def element(kind, body):
    return kind.to_bytes((kind.bit_length() + 7) // 8, 'big') + vint(len(body)) + body

def uint(kind, value):
    return element(kind, value.to_bytes(max(1, (value.bit_length() + 7) // 8), 'big'))

def read_vint(data, offset, tag=False):
    if offset >= len(data) or not data[offset]:
        raise ValueError('invalid EBML integer')
    width = next(n for n in range(1, 9) if data[offset] & (1 << (8 - n)))
    if offset + width > len(data):
        raise ValueError('truncated EBML integer')
    value = int.from_bytes(data[offset:offset + width], 'big')
    return (value if tag else value & ((1 << (7 * width)) - 1)), offset + width

def elements(data, start=0, end=None):
    end = len(data) if end is None else end
    while start < end:
        kind, pos = read_vint(data, start, True)
        size, body = read_vint(data, pos)
        if body + size > end:
            raise ValueError('element exceeds parent')
        yield {'id': kind, 'start': start, 'body': body, 'end': body + size}
        start = body + size

def nals(packet):
    offset, types = 0, []
    while offset < len(packet):
        size = int.from_bytes(packet[offset:offset + 4], 'big')
        if size < 1 or offset + 4 + size > len(packet):
            raise ValueError('invalid NAL length')
        types.append(packet[offset + 4] & 31)
        offset += 4 + size
    return types

commands, originals = [], []
for name, profile, coder, hue in [('a', 'baseline', '0', 0), ('b', 'high', '1', 90)]:
    path = OUT / (name + '.mp4')
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
           f'testsrc2=size=160x96:rate=10:duration=1,hue=h={hue}', '-an', '-c:v', 'libx264',
           '-preset', 'medium', '-profile:v', profile, '-coder', coder, '-g', '10', '-bf', '0', str(path)]
    commands.append(cmd)
    subprocess.run(cmd, check=True)
    data = path.read_bytes()
    marker = data.index(b'avcC')
    size = int.from_bytes(data[marker - 4:marker], 'big')
    private = data[marker + 4:marker - 4 + size]
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_packets', '-of', 'json', str(path)]))
    packets = [data[int(p['pos']):int(p['pos']) + int(p['size'])] for p in probe['packets']]
    assert len(packets) == 10 and 5 in nals(packets[0])
    assert all(not ({7, 8} & set(nals(packet))) for packet in packets), 'in-band SPS/PPS would hide wrong state'
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'])
    frame_bytes = 160 * 96 * 3 // 2
    assert len(raw) == 10 * frame_bytes
    originals.append({'name': name, 'private': private, 'packets': packets,
                      'frameHashes': [sha(raw[p:p + frame_bytes]) for p in range(0, len(raw), frame_bytes)]})

header = element(0x1A45DFA3, uint(0x4286, 1) + uint(0x42F7, 1) + uint(0x42F2, 4)
                 + uint(0x42F3, 8) + element(0x4282, b'matroska') + uint(0x4287, 4) + uint(0x4285, 2))
info = element(0x1549A966, uint(0x2AD7B1, 1000000) + element(0x4489, struct.pack('>d', 2000.0))
               + element(0x4D80, b'Demuxe research') + element(0x5741, b'Demuxe research'))
track = uint(0xD7, 1) + uint(0x73C5, 1) + uint(0x83, 1) + element(0x86, b'V_MPEG4/ISO/AVC')
track += element(0x63A2, originals[0]['private']) + uint(0x23E383, 100000000)
track += element(0xE0, uint(0xB0, 160) + uint(0xBA, 96))
tracks = element(0x1654AE6B, element(0xAE, track))
prefix, clusters, state_position = info + tracks, [], None
for epoch, source in enumerate(originals):
    timestamp = uint(0xE7, epoch * 1000)
    blocks = []
    for index, packet in enumerate(source['packets']):
        block = b'\x81' + struct.pack('>h', index * 100) + bytes([0x80 if index == 0 else 0]) + packet
        if epoch == 1 and index == 0:
            state = element(0xA4, source['private'])
            group_body = state + element(0xA1, block[:3] + b'\0' + block[4:])
            group = element(0xA0, group_body)
            blocks.append(group)
        else:
            blocks.append(element(0xA3, block))
    cluster_body = timestamp + b''.join(blocks)
    cluster = element(0x1F43B675, cluster_body)
    cluster_position = len(prefix) + sum(map(len, clusters))
    if epoch == 1:
        state_position = cluster_position + len(cluster) - len(cluster_body) + len(timestamp) + len(group) - len(group_body)
    clusters.append(cluster)
points = []
for epoch in range(2):
    cluster_position = len(prefix) + sum(map(len, clusters[:epoch]))
    cue = uint(0xF7, 1) + uint(0xF1, cluster_position) + uint(0xEA, state_position if epoch else 0)
    points.append(element(0xBB, uint(0xB3, epoch * 1000) + element(0xB7, cue)))
cues = element(0x1C53BB6B, b''.join(points))
payload = prefix + b''.join(clusters) + cues
source = header + element(0x18538067, payload)
(OUT / 'two-epochs.mkv').write_bytes(source)
segment = next(e for e in elements(source) if e['id'] == 0x18538067)
assert next(elements(source, segment['body'] + state_position))['id'] == 0xA4
input_record = {'sourceSHA256': sha(source), 'segmentData': segment['body'], 'statePosition': state_position,
                'cuesPosition': len(prefix) + sum(map(len, clusters)), 'width': 160, 'height': 96,
                'epochs': [{'name': x['name'], 'private': list(x['private']),
                            'codec': 'avc1.' + x['private'][1:4].hex(),
                            'frameHashes': x['frameHashes']} for x in originals],
                'references': ['https://www.matroska.org/technical/elements.html', 'https://www.matroska.org/technical/cues.html'],
                'contract': 'CueCodecState points to a CodecState element relative to Segment data; zero selects initial TrackEntry. State selects configuration only, never missing prediction history.'}
(OUT / 'input.json').write_text(json.dumps(input_record, indent=2) + '\n')
(OUT / 'generator.json').write_text(json.dumps(commands, indent=2) + '\n')
print(json.dumps({'sourceBytes': len(source), 'codecs': [x['codec'] for x in input_record['epochs']], 'statePosition': state_position}))

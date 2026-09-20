# SPDX-License-Identifier: Apache-2.0
"""Compare a real MP4 table reader with a source-bound compact packet sidecar."""
from pathlib import Path
import bisect
import hashlib
import json
import random
import statistics
import struct
import subprocess
import time

HOME = Path(__file__).resolve().parents[1]
OUT = HOME / 'evidence/20260919T221500Z-compact-packet-index'
OUT.mkdir(exist_ok=True)
SOURCE = Path('research/items/R297.query-mp4-timing-tables-without-expanding-every-sample-record/evidence/20260919T200000Z-signed-timing-origins/source.mp4')
DATA = SOURCE.read_bytes()
KEY = hashlib.sha256(DATA).digest()
QUERIES = [20, 3, 21, 3, 95, 0, 48, 71]
plan = {'workload': 'Actual 96-sample signed-CTTS MP4; eight nonmonotonic ordinal queries per fresh owner. Baseline uses existing compressed MP4 sample tables, not padded scalar records.',
        'metrics': 'Source-bound compact serialized bytes versus the actual required MP4 table boxes; cold preparation and eight exact queries in nanoseconds.',
        'gate': 'At least 10% serialized-byte saving and 5% median complete cold-job saving. Eleven alternating batches of 100 jobs; bootstrap 95% median interval.',
        'costs': 'Candidate must author its sidecar from source tables in each cold job. Both verify source hash and parse source; candidate encoding and query scans included. Resident file acquisition and independent ffprobe oracle excluded equally. This does not replace native FFmpeg internal allocation.'}
(OUT / 'predeclared.json').write_text(json.dumps(plan, indent=2) + '\n')

def tables():
    found = {}
    def walk(start, end):
        while start < end:
            size, kind = struct.unpack_from('>I4s', DATA, start)
            if size < 8 or start + size > end:
                raise ValueError('MP4 box bound')
            if kind in (b'moov', b'trak', b'mdia', b'minf', b'stbl'):
                walk(start + 8, start + size)
            if kind in (b'stts', b'ctts', b'stsc', b'stsz', b'stco', b'co64', b'stss'):
                found[kind] = DATA[start:start + size]
            start += size
    walk(0, len(DATA))
    def rows(kind, width, signed=False):
        box = found[kind]
        count = int.from_bytes(box[12:16], 'big')
        values = []
        for p in range(16, len(box), width * 4):
            values.append(tuple(int.from_bytes(box[p + 4*i:p + 4*i + 4], 'big', signed=signed and i == 1) for i in range(width)))
        assert len(values) == count
        return values
    stts = rows(b'stts', 2)
    ctts = rows(b'ctts', 2, found[b'ctts'][8] == 1)
    stsc = rows(b'stsc', 3)
    sz = found[b'stsz']; default, count = struct.unpack_from('>II', sz, 12)
    sizes = [default] * count if default else [int.from_bytes(sz[p:p+4], 'big') for p in range(20, len(sz), 4)]
    assert len(sizes) == count
    assert b'co64' not in found, 'this bounded fixture uses stco'
    offsets = [r[0] for r in rows(b'stco', 1)]
    keys = {r[0]-1 for r in rows(b'stss', 1)} if b'stss' in found else set(range(count))
    # MOV's negative-CTTS decode shift is explicit for this fixture and checked
    # against independent ffprobe for every scalar, never inferred universally.
    dts_bias = min(0, min(value for _, value in ctts))
    return {'stts': stts, 'ctts': ctts, 'stsc': stsc, 'sizes': sizes, 'offsets': offsets,
            'keys': keys, 'dts_bias': dts_bias, 'bytes': sum(map(len, found.values())), 'count': count}

def query(state, index):
    if not 0 <= index < state['count']:
        raise ValueError('sample ordinal')
    base = clock = 0
    for count, duration in state['stts']:
        if index < base + count:
            dts = clock + (index-base)*duration
            break
        base += count; clock += count*duration
    base = 0
    for count, cto in state['ctts']:
        if index < base + count:
            break
        base += count
    first_sample = 0
    for chunk_index, offset in enumerate(state['offsets'], 1):
        row = max(row for row in state['stsc'] if row[0] <= chunk_index)
        chunk_samples = row[1]
        if index < first_sample + chunk_samples:
            position = offset + sum(state['sizes'][first_sample:index])
            return (position, state['sizes'][index], dts + state['dts_bias'], dts + cto, duration, index in state['keys'])
        first_sample += chunk_samples
    raise ValueError('sample chunk missing')

def varint(value):
    if value < 0:
        raise ValueError('negative unsigned scalar')
    data = bytearray()
    while value >= 128:
        data.append((value & 127) | 128); value >>= 7
    data.append(value)
    return data

def read_varint(data, pos):
    value = shift = 0
    while True:
        if pos >= len(data) or shift >= 70:
            raise ValueError('truncated or oversized varint')
        byte = data[pos]; pos += 1; value |= (byte & 127) << shift
        if byte < 128:
            return value, pos
        shift += 7

def zz(value):
    return value * 2 if value >= 0 else -value * 2 - 1

def unzz(value):
    return value // 2 if not value & 1 else -(value // 2) - 1

def encode(state):
    output = bytearray(b'DXI1' + KEY) + varint(state['count'])
    previous_end = previous_dts = 0
    for index in range(state['count']):
        position, size, dts, pts, duration, key = query(state, index)
        for value in (position-previous_end, size, zz(dts-previous_dts), zz(pts-dts), duration, int(key)):
            output += varint(value)
        previous_end = position + size; previous_dts = dts
    return bytes(output)

def compact_query(data, index):
    if data[:4] != b'DXI1' or data[4:36] != KEY:
        raise ValueError('source identity or version')
    count, pos = read_varint(data, 36)
    if not 0 <= index < count:
        raise ValueError('sample ordinal')
    previous_end = previous_dts = 0
    for ordinal in range(index + 1):
        values = []
        for _ in range(6):
            value, pos = read_varint(data, pos); values.append(value)
        gap, size, dts_delta, cto, duration, key = values
        if key > 1:
            raise ValueError('key flag')
        position = previous_end + gap; dts = previous_dts + unzz(dts_delta)
        row = (position, size, dts, dts + unzz(cto), duration, bool(key))
        previous_end = position + size; previous_dts = dts
    return row

state = tables(); compact = encode(state)
packets = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_packets', '-of', 'json', str(SOURCE)]))['packets']
expected = [(int(p['pos']), int(p['size']), p['dts'], p['pts'], p['duration'], 'K' in p['flags']) for p in packets]
assert [query(state, i) for i in range(96)] == expected
assert [compact_query(compact, i) for i in range(96)] == expected
controls = {}
for name, bad, index in [('stale', compact[:4]+b'\0'*32+compact[36:], 3), ('truncated', compact[:-1], 95), ('ordinal', compact, 96)]:
    try:
        compact_query(bad, index)
        raise AssertionError(name + ' accepted')
    except ValueError as error:
        controls[name] = str(error)
assert all(unzz(zz(x)) == x for x in [-1536, -512, -1, 0, 512, 1536])
(OUT / 'index.dxi').write_bytes(compact)
(OUT / 'scalars.json').write_text(json.dumps(expected, indent=2) + '\n')
rows = []
for pair in range(11):
    row = {'pair': pair}
    for mode in (['tables', 'compact'] if pair % 2 == 0 else ['compact', 'tables']):
        start = time.perf_counter_ns()
        for _ in range(100):
            assert hashlib.sha256(DATA).digest() == KEY
            fresh = tables()
            if mode == 'compact':
                encoded = encode(fresh)
                observed = [compact_query(encoded, i) for i in QUERIES]
            else:
                observed = [query(fresh, i) for i in QUERIES]
            assert observed == [expected[i] for i in QUERIES]
        row[mode] = (time.perf_counter_ns() - start) / 100
    row['saving_pct'] = 100 * (row['tables']-row['compact']) / row['tables']
    rows.append(row)
savings = [row['saving_pct'] for row in rows]
random.seed(226)
boot = sorted(statistics.median(random.choices(savings, k=11)) for _ in range(10000))
result = {'source': str(SOURCE), 'sourceSHA256': KEY.hex(), 'samples': 96, 'all_scalars_exact': True,
          'controls': controls, 'tableBytes': state['bytes'], 'compactBytes': len(compact),
          'serializedSavingPct': 100*(1-len(compact)/state['bytes']), 'rows_ns_per_job': rows,
          'medianSavingPct': statistics.median(savings), 'bootstrap95MedianPct': [boot[250], boot[9749]],
          'productionOpportunity': 'Current remux code delegates seeks to av_seek_frame and does not persist this six-field sidecar. Adding a sidecar does not remove existing MP4 tables or replace native FFmpeg indices.'}
result['passed'] = result['serializedSavingPct'] >= 10 and result['medianSavingPct'] >= 5
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))

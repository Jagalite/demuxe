# SPDX-License-Identifier: Apache-2.0
"""Research-only: build source-bound Cues from strict single-track VP9 SimpleBlocks.
No old index, cue sidecar, indexed original or expected output hash is consumed.
The preserved representation requires an existing SeekHead pointing to a tail Void.
"""
import ast, hashlib, json, pathlib, sys, time, resource

def definitions(path):
    tree = ast.parse(pathlib.Path(path).read_text())
    tree.body = [n for n in tree.body if isinstance(n, (ast.Import, ast.ImportFrom, ast.FunctionDef))]
    namespace = {}
    exec(compile(tree, path, 'exec'), namespace)
    return namespace

parser = definitions('research/shared/tooling/virtual-cues-fixture.py')
writer = definitions('research/shared/tooling/large-cluster-fixture.py')
vint = parser['vint']
box, uint = writer['box'], writer['uint']

def elements(b, start=0, end=None):
    # Keep retained VINT decoding, but reject truncated/unknown-length elements
    # instead of the fixture helper's min(end) clamping.
    end = len(b) if end is None else end
    count = 0
    while start < end:
        count += 1
        if count > 100000:
            raise ValueError('element budget')
        tag, q, _ = vint(b, start, True)
        length, body, width = vint(b, q)
        if length == (1 << (7 * width)) - 1 or body + length > end:
            raise ValueError('unknown/truncated element')
        yield tag, start, body, body + length, width
        start = body + length


def build(source):
    if len(source) > 32 * 1024 * 1024:
        raise ValueError('finite 32MiB source budget')
    roots = list(elements(source))
    segment = next(x for x in roots if x[0] == 0x18538067)
    top = list(elements(source, segment[2], segment[3]))
    if any(x[0] == 0x1c53bb6b for x in top):
        raise ValueError('source already indexed')
    tail = top[-1]
    if tail[0] != 0xec or tail[3] != len(source):
        raise ValueError('requires reserved tail Void; no arbitrary offset rewrite')
    info = next(x for x in top if x[0] == 0x1549a966)
    fields = {x[0]: source[x[2]:x[3]] for x in elements(source, info[2], info[3])}
    if int.from_bytes(fields.get(0x2ad7b1, bytes.fromhex('0f4240')), 'big') != 1000000:
        raise ValueError('requires 1ms timecode scale')
    tracks = next(x for x in top if x[0] == 0x1654ae6b)
    entries = [x for x in elements(source, tracks[2], tracks[3]) if x[0] == 0xae]
    if len(entries) != 1:
        raise ValueError('single-track source only')
    f = {x[0]: source[x[2]:x[3]] for x in elements(source, entries[0][2], entries[0][3])}
    track = int.from_bytes(f[0xd7], 'big')
    if int.from_bytes(f[0x83], 'big') != 1 or f[0x86] != b'V_VP9' or 0x6d80 in f:
        raise ValueError('ordinary uncompressed VP9 video track only')
    seek = next(x for x in top if x[0] == 0x114d9b74)
    cue_seek = []
    for entry in elements(source, seek[2], seek[3]):
        fields = {x[0]: source[x[2]:x[3]] for x in elements(source, entry[2], entry[3])}
        if fields.get(0x53ab) == bytes.fromhex('1c53bb6b'):
            cue_seek.append(int.from_bytes(fields[0x53ac], 'big'))
    if cue_seek != [tail[1] - segment[2]]:
        raise ValueError('existing SeekHead must address reserved tail Void')
    points, packets = [], []
    for cluster in [x for x in top if x[0] == 0x1f43b675]:
        children = list(elements(source, cluster[2], cluster[3]))
        times = [int.from_bytes(source[x[2]:x[3]], 'big') for x in children if x[0] == 0xe7]
        if len(times) != 1 or any(x[0] == 0xa0 for x in children):
            raise ValueError('requires one cluster timestamp and SimpleBlocks')
        for element in [x for x in children if x[0] == 0xa3]:
            tr, pos, _ = vint(source, element[2])
            if tr != track or pos + 3 > element[3]:
                raise ValueError('track/block bound')
            flags = source[pos + 2]
            if flags & 6:
                raise ValueError('laced blocks excluded')
            if flags & 0x78:
                raise ValueError('invisible/reserved block flags excluded')
            timestamp = times[0] + int.from_bytes(source[pos:pos+2], 'big', signed=True)
            if timestamp < 0:
                raise ValueError('negative timestamp outside profile')
            payload = source[pos+3:element[3]]
            packets.append({'timestamp_ticks': timestamp, 'key': bool(flags & 128), 'sha256': hashlib.sha256(payload).hexdigest(), 'payload_bytes': len(payload)})
            if flags & 128:
                points.append({'time': timestamp, 'cluster': cluster[1]-segment[2], 'relative': element[1]-cluster[2], 'track': track})
    if not points or len(points) > 10000:
        raise ValueError('cue budget')
    cue = box(0x1c53bb6b, b''.join(box(0xbb, uint(0xb3, p['time']) + box(0xb7, uint(0xf7, p['track']) + uint(0xf1, p['cluster']) + uint(0xf0, p['relative']))) for p in points))
    gap = tail[3]-tail[1]-len(cue)
    if gap < 0 or gap == 1:
        raise ValueError('reserved tail capacity insufficient')
    padding = b''
    if gap:
        for length in range(max(0,gap-9),gap):
            v = box(0xec, bytes(length))
            if len(v)==gap:
                padding=v
                break
        if not padding:
            raise ValueError('Void padding')
    output = source[:tail[1]] + cue + padding
    assert len(output)==len(source) and output[:tail[1]]==source[:tail[1]]
    return output, {'points':points,'packets':packets,'overlay_start':tail[1],'overlay_bytes':len(cue),'source_bytes':len(source),'source_sha256':hashlib.sha256(source).hexdigest(),'output_sha256':hashlib.sha256(output).hexdigest(),'scope':'single-track VP9, SimpleBlocks, preallocated tail Void and existing truthful SeekHead. Key flags require independent FFprobe/decoded-reference qualification before performance.'}

if __name__ == '__main__':
    source, output = map(pathlib.Path, sys.argv[1:3])
    start=time.perf_counter()
    raw=source.read_bytes()
    candidate, metadata=build(raw)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_bytes(candidate)
    metadata['cold_read_scan_hash_write_ms']=(time.perf_counter()-start)*1000
    usage=resource.getrusage(resource.RUSAGE_SELF)
    metadata['process_cpu_seconds']=usage.ru_utime+usage.ru_stime
    output.with_suffix('.index.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(json.dumps({'bytes':len(candidate),'points':len(metadata['points']),'cold_read_scan_hash_write_ms':metadata['cold_read_scan_hash_write_ms']}))

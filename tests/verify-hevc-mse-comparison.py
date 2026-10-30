#!/usr/bin/env python3
"""Verify finite captured-MSE comparisons, not a release qualification."""
import hashlib
import json
import re
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


root = Path('packages/provider-mediabunny/qualification')
tmp = Path('/private/tmp')
capture_script = sha(Path('tests/codec-preparation-append-capture.mjs').read_bytes())
replay_script = sha(Path('tests/codec-hevc-mse-replay.mjs').read_bytes())
captures = {}
for browser in ('chrome', 'firefox'):
    receipt = json.loads((root / f'reader-hevc-capture-{browser}.json').read_bytes())
    event_bytes = (root / f'reader-hevc-capture-{browser}-events.json').read_bytes()
    events = json.loads(event_bytes)
    assert receipt['harnessSHA256'] == capture_script and receipt['family'] == browser
    assert receipt['cleanup']['remainingProcessIDs'] == []
    assert receipt['passed'] == (browser == 'chrome')
    if browser == 'firefox':
        assert 'Seek presentation failure: Remux target buffer timeout' in receipt['error']
    appends = [e for e in events if e['type'] == 'append' and e['buffer'] == 2]
    assert [e['serial'] for e in appends] == list(range(1, len(appends)+1))
    files = [tmp / f'demuxe-reader-hevc-capture-{browser}' / f"2-{e['serial']}.bin" for e in appends]
    parts = [p.read_bytes() for p in files]
    assert all(len(p) == e['bytes'] for p, e in zip(parts, appends))
    ranges = [e['ranges'] for e in events if e['type'] == 'updateend' and e['buffer'] == 2]
    assert len(ranges) == len(appends)
    assert (any(ranges) if browser == 'chrome' else not any(ranges))
    captures[browser] = {'bytes': sum(map(len, parts)), 'sha256': sha(b''.join(parts)),
                         'eventsSHA256': sha(event_bytes), 'appends': len(parts), 'lastRange': ranges[-1]}
assert captures['firefox']['sha256'] == captures['chrome']['sha256']

comparisons = {}
for name in ('mse-replay', 'replay-video', 'replay-audio', 'replay-video-start'):
    data = (root / f'reader-hevc-{name}.json').read_bytes()
    receipt = json.loads(data)
    assert not receipt.get('error') and receipt['harnessSHA256'] == replay_script
    assert len(receipt['runs']) == 4
    for run in receipt['runs']:
        assert run['supported'] and run['videoError'] is None
        if run['offset'] == 0:
            expected = not (run['family'] == 'firefox' and name in ('mse-replay', 'replay-video'))
            assert bool(run['ranges'][-1]) == expected
    for run in receipt['runs']:
        if 'cleanup' in run:
            assert run['cleanup']['remainingProcessIDs'] == []
    if name == 'mse-replay':
        assert receipt['joinedSHA256'] == captures['firefox']['sha256']
        assert not next(r for r in receipt['runs'] if r['family'] == 'firefox' and r['offset'] == -2)['ranges'][-1]
    comparisons[name] = {'receiptSHA256': sha(data), 'joinedSHA256': receipt['joinedSHA256'],
                         'zeroOffsetRanges': {r['family']: r['ranges'][-1] for r in receipt['runs'] if r['offset'] == 0}}

nal_types = {}
for name in ('start', 'seek'):
    trace = (tmp / f'demuxe-reader-hevc-{name}-trace.log').read_text()
    types = [int(x) for x in re.findall(r'nal_unit_type\s+[01]+\s+=\s+(\d+)', trace)]
    nal_types[name] = next(x for x in types if x <= 31)
assert nal_types == {'start': 20, 'seek': 21}
print(json.dumps({'status': 'finite-browser-mse-comparison-not-release', 'capture': captures,
                  'comparisons': comparisons, 'firstVclNalTypes': nal_types,
                  'limits': 'Track-isolated files were remuxed with FFmpeg 8.1.2; IDR/CRA correlation does not prove cause or a safe repair.'}, indent=2))

#!/usr/bin/env python3
"""Validate captured HEVC preroll replay experiments; diagnostic only."""
import copy
import hashlib
import json
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


root = Path('packages/provider-mediabunny/qualification')
source = Path('/private/tmp/demuxe-reader-hevc-capture-firefox')
harness = sha(Path('tests/codec-hevc-mse-replay.mjs').read_bytes())
specs = {'preroll': (2, False), 'preroll-init': (2, True),
         'continuous5': (5, False), 'continuous6': (6, False), 'continuous11': (11, False)}


def check(receipt, files, prefix):
    assert receipt['harnessSHA256'] == harness and not receipt.get('error')
    parts = [p.read_bytes() for p in files]
    assert receipt['fragmentSHA256'] == [sha(p) for p in parts]
    assert receipt['joinedSHA256'] == sha(b''.join(parts))
    assert len(receipt['runs']) == 4
    result = {}
    for family in ('chrome', 'firefox'):
        run = next(r for r in receipt['runs'] if r['family'] == family and r['offset'] == 0)
        assert run['supported'] and run['videoError'] is None and len(run['ranges']) == len(files)
        before, after = run['ranges'][prefix-1], run['ranges'][-1]
        assert before and after
        end = after[-1][1]
        assert end > 8 if family == 'chrome' else end < 6.5
        result[family] = {'beforeSeekRanges': before, 'afterSeekRanges': after}
    for run in receipt['runs']:
        if 'cleanup' in run:
            assert run['cleanup']['remainingProcessIDs'] == []
    return result


results = {}
for name, (prefix, include_init) in specs.items():
    files = [source / f'1-{i}.bin' for i in range(1, prefix+1)]
    files += [source / f'2-{i}.bin' for i in range(1 if include_init else 2, 13)]
    raw = (root / f'reader-hevc-replay-{name}.json').read_bytes()
    receipt = json.loads(raw)
    results[name] = {'receiptSHA256': sha(raw), 'ranges': check(receipt, files, prefix)}
    altered = copy.deepcopy(receipt)
    altered['fragmentSHA256'][0] = 'wrong'
    try:
        check(altered, files, prefix)
    except AssertionError:
        pass
    else:
        raise AssertionError('Changed fragment identity accepted')
print(json.dumps({'status': 'finite-hevc-preroll-replay-not-release', 'results': results,
                  'negativeControls': len(specs),
                  'limits': 'Same captured fixture, synthetic append sequences; no proof of root cause, playback, or release safety.'}, indent=2))

#!/usr/bin/env python3
"""Check retained Firefox seek-failure diagnostics; this does not qualify playback."""
import copy
import hashlib
import json
from pathlib import Path


def inspect(receipt):
    assert receipt['family'] == 'firefox' and receipt['passed'] is False
    error = receipt['error']
    assert 'No available deployment satisfies the remaining playback candidates' in error
    start = error.index('{"remuxRuntime"')
    diagnostic, _ = json.JSONDecoder().raw_decode(error[start:])
    attempts = diagnostic['selection']['attempts']
    assert any(a['mode'] == 'native' and a['outcome'] == 'failed' and
               a['reason'] == 'Seek presentation failure: Remux target buffer timeout' for a in attempts)
    assert any(a['mode'] == 'hybrid' and 'web/engine-hybrid/player.wasm' in a['reason'] for a in attempts)
    backend = diagnostic['backend']
    remux = backend['remux']
    sessions = remux['stats']['sessions']
    assert sessions[0]['target'] == 0 and sessions[0]['firstPlayableMs'] is not None
    seek = sessions[1]
    assert seek['target'] == 2 and seek['firstPlayableMs'] is None
    fragments = [f for f in remux['stats']['fragments'] if f['generation'] == seek['generation']]
    assert fragments and sum(f['bytes'] for f in fragments) > 0
    assert remux['ranges'] == [] and remux['stats']['errors'] == []
    assert backend['capability']['playbackReady'] is True
    assert backend['capability']['audioEvidenceStrength'] == 'presence'
    return {'runtime': receipt['runtime'], 'seekTarget': seek['target'],
            'seekFragments': len(fragments), 'seekFragmentBytes': sum(f['bytes'] for f in fragments),
            'ranges': remux['ranges'], 'audioEvidence': backend['capability']['audioEvidenceStrength'],
            'losslessCheckWarnings': sum('Lossless check failed' in line for line in remux['logs'])}


root = Path('packages/provider-mediabunny/qualification')
results = []
for runtime in ('asyncify', 'jspi'):
    path = root / f'reader-combined-real-{runtime}-firefox.json'
    raw = path.read_bytes()
    receipt = json.loads(raw)
    result = inspect(receipt)
    result['receiptSHA256'] = hashlib.sha256(raw).hexdigest()
    results.append(result)
    for old, new in [('Remux target buffer timeout', 'different failure'),
                     ('web/engine-hybrid/player.wasm', 'different asset')]:
        modified = copy.deepcopy(receipt)
        modified['error'] = modified['error'].replace(old, new)
        try:
            inspect(modified)
        except (AssertionError, ValueError, KeyError):
            pass
        else:
            raise AssertionError(f'negative control accepted: {old}')

print(json.dumps({'status': 'retained-failure-diagnostics-verified-not-release',
                  'verifierSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  'results': results, 'negativeControls': 4,
                  'limits': 'Diagnostics do not establish root cause, audibility, or fallback behavior.'}, indent=2))

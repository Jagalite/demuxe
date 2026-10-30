#!/usr/bin/env python3
"""Verify the retained, test-owned HEVC/DTS-HD seek comparison."""
import copy
import hashlib
import json
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


root = Path('packages/provider-mediabunny/qualification')
manifest_bytes = (root / 'reader-hevc-dtshd-control-fixture.json').read_bytes()
fixture = json.loads(manifest_bytes)['cases'][0]
source = Path(fixture['file']).read_bytes()
assert fixture['id'] == 'hevc-dtshd' and fixture['profile'] == 'dts-hd'
assert len(source) == fixture['bytes'] and sha(source) == fixture['sha256']
harness_hash = sha(Path('tests/codec-preparation-candidate-real-player.mjs').read_bytes())


def verify(receipt, runtime):
    assert receipt['family'] == 'firefox' and receipt['runtime'] == runtime
    assert receipt['passed'] is False and receipt['cases'] == []
    assert receipt['fixtureManifestSHA256'] == sha(manifest_bytes)
    assert receipt['harnessSHA256'] == harness_hash
    deployment = Path(receipt['setup']['work']) / 'deployed/demuxe-providers.json'
    assert sha(deployment.read_bytes()) == receipt['deploymentSHA256']
    assert receipt['cleanup']['remainingProcessIDs'] == []
    error = receipt['error']
    assert 'No available deployment satisfies the remaining playback candidates' in error
    diagnostic, _ = json.JSONDecoder().raw_decode(error[error.index('{"remuxRuntime"'):])
    assert any(a['outcome'] == 'failed' and a['reason'] == 'Seek presentation failure: Remux target buffer timeout'
               for a in diagnostic['selection']['attempts'])
    backend = diagnostic['backend']
    assert backend['capability']['playbackReady'] is True
    remux = backend['remux']
    sessions = remux['stats']['sessions']
    assert sessions[0]['target'] == 0 and sessions[0]['firstPlayableMs'] is not None
    seek = sessions[1]
    assert seek['target'] == 2 and seek['firstPlayableMs'] is None
    assert remux['ranges'] == [] and remux['stats']['errors'] == []
    fragments = [f for f in remux['stats']['fragments'] if f['generation'] == seek['generation']]
    assert fragments and sum(f['bytes'] for f in fragments) > 0
    assert f'/dts-hd-{runtime}/' in remux['remux']['asset']
    return {'runtime': runtime, 'browser': receipt['browser'], 'seekFragments': len(fragments),
            'seekFragmentBytes': sum(f['bytes'] for f in fragments), 'ranges': remux['ranges']}


results = []
for runtime in ('asyncify', 'jspi'):
    raw = (root / f'demuxe-reader-hevc-dtshd-control-{runtime}-firefox.json').read_bytes()
    receipt = json.loads(raw)
    result = verify(receipt, runtime)
    result['receiptSHA256'] = sha(raw)
    results.append(result)
    for field, value in [('fixtureManifestSHA256', 'wrong'), ('harnessSHA256', 'wrong')]:
        altered = copy.deepcopy(receipt)
        altered[field] = value
        try:
            verify(altered, runtime)
        except AssertionError:
            pass
        else:
            raise AssertionError(f'negative control accepted: {field}')

print(json.dumps({'status': 'finite-firefox-hevc-dtshd-seek-failed-not-release',
                  'verifierSHA256': sha(Path(__file__).read_bytes()),
                  'fixtureSHA256': fixture['sha256'], 'results': results, 'negativeControls': 4,
                  'limits': 'Separate fixture; test-owned identities; no root-cause or fallback proof.'}, indent=2))

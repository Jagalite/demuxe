#!/usr/bin/env python3
"""Check independent MOV profile-decline playback receipts, not release qualification."""
import copy
import hashlib
import json
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


root = Path('packages/provider-mediabunny/qualification')
fixture = Path('tests/fixtures/mediabunny-independent-aac-stereo.mov').read_bytes()
assert fixture[4:12] == b'ftypqt  '
fixture_hash = sha(fixture)
harness_hash = sha(Path('tests/mediabunny-independent-backup.mjs').read_bytes())
deployment = Path('/private/tmp/demuxe-reader-combined-composed')
manifest_bytes = (deployment / 'demuxe-providers.json').read_bytes()
manifest = json.loads(manifest_bytes)
providers = {p['id']: p['implementationIdentity'] for p in manifest['providers']}


def verify(receipt, browser, remote):
    assert receipt['status'] == 'selected-backup-cases-passed-not-complete-matrix'
    assert receipt['requestedCases'] == ['natural-decline'] and not receipt['completeMatrix']
    assert receipt['browserEngine'] == browser and receipt['remote'] == remote
    assert receipt['audioOnly'] and receipt['container'] == 'mov' and receipt['audioChannels'] == 2
    assert receipt['identities']['harness'] == harness_hash
    assert receipt['identities']['mediabunny'] == providers['mediabunny-mp4-file-preparation']
    assert receipt['identities']['backup'] == providers['ffmpeg-file-preparation']
    assert receipt['fixtures']['ordinary'] == {'sha256': fixture_hash, 'bytes': len(fixture)}
    assert receipt['fixtures']['declined'] == {'sha256': fixture_hash, 'bytes': len(fixture), 'unmodified': True}
    assert receipt['serverErrors'] == []
    requests = receipt['served'].count('/media.mp4')
    assert (requests > 0) == remote
    assert len(receipt['cases']) == 1
    case = receipt['cases'][0]
    assert case['name'] == 'natural-decline' and case['plan'] == 'native-remux'
    assert case['ffmpegCalls'] > 0 and case['freshAudioTime'] > 1.25
    assert any(m.get('type') == 'preparation-result' and m.get('prepared') is False for m in case['messages'])
    assert len(case['audio']) == 2
    assert all(a['rms'] > .01 and a['expected'] > a['other'] * 2 for a in case['audio'])
    assert case['remainingWorkers'] == 0 and case['remainingURLs'] == 0
    paths = [entry['path'] for entry in case['deliveries']]
    assert '/web/providers/mediabunny/mp4.js' in paths
    assert '/web/engine-remux/remux.wasm' in paths
    assert not any('/web/providers/preparation/' in path for path in paths)
    for entry in case['deliveries']:
        data = (deployment / entry['path'].lstrip('/')).read_bytes()
        assert len(data) == entry['bytes'] and sha(data) == entry['sha256']
    for path, fact in receipt['staticInputs'].items():
        if path == '/app.js':
            data = b"export {Player,DemuxeRuntime} from '/dist/index.js';"
        else:
            data = (deployment / path.lstrip('/')).read_bytes()
        assert len(data) == fact['bytes'] and sha(data) == fact['sha256'], path
    return {'browser': receipt['browser'], 'remote': remote, 'rangeRequests': requests,
            'freshAudioTime': case['freshAudioTime'], 'ffmpegCalls': case['ffmpegCalls'],
            'audioRMS': [a['rms'] for a in case['audio']]}


results = []
for label, browser, remote in [('chrome', 'chrome', False), ('firefox', 'firefox', False),
                               ('remote-chrome', 'chrome', True), ('remote-firefox', 'firefox', True)]:
    raw = (root / f'reader-independent-mov-fallback-{label}.json').read_bytes()
    receipt = json.loads(raw)
    result = verify(receipt, browser, remote)
    result['receiptSHA256'] = sha(raw)
    results.append(result)
    mutations = [lambda r: r['fixtures']['ordinary'].update(sha256='wrong'),
                 lambda r: r['cases'][0].update(ffmpegCalls=0),
                 lambda r: r['cases'][0]['audio'][0].update(rms=0)]
    for mutate in mutations:
        changed = copy.deepcopy(receipt)
        mutate(changed)
        try:
            verify(changed, browser, remote)
        except AssertionError:
            pass
        else:
            raise AssertionError('Changed evidence accepted')
print(json.dumps({'status': 'independent-mov-natural-fallback-passed-not-release',
                  'fixtureSHA256': fixture_hash, 'fixtureBytes': len(fixture),
                  'fixtureAuthorship': 'FFmpeg 8.1.2 lavfi 440/660 Hz stereo AAC in QuickTime MOV',
                  'deploymentManifestSHA256': sha(manifest_bytes), 'harnessSHA256': harness_hash,
                  'results': results, 'negativeControls': 12,
                  'limits': ['Test-owned provider identities and archived FFmpeg candidate; not production qualification.',
                             'One unsupported 48 kHz stereo MOV; no complete packet/PCM, broader profile, or mpv claim.',
                             'Remote server requires authorized explicit range requests; recorded counts are paths, not byte-range logs.']}, indent=2))

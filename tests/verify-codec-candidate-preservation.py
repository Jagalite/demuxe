#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Recheck finite candidate audio/video hashes with the same pinned native decoder."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('receipt', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
receipt = json.loads(args.receipt.read_bytes())
host_path = Path('results/media-components/production-audio/host-recipes.json')
host = json.loads(host_path.read_bytes())
ffmpeg = Path('/opt/homebrew/bin/ffmpeg')
x265 = Path('/opt/homebrew/Cellar/x265/4.2/lib/libx265.216.dylib')
environment = {**os.environ, 'DYLD_LIBRARY_PATH': str(x265.parent)}
assert sha(ffmpeg) == receipt['ffmpegSHA256'] and sha(x265) == receipt['x265SHA256']
assert sha('tests/codec-preparation-candidate-preservation.mjs') == receipt['harnessSHA256']
assert sha(host_path) == receipt['hostSHA256'] and host['passed'] is True
assert len(host['results']) == 6
for profile, build in receipt['builds'].items():
    for name in ['remux.mjs', 'remux.wasm']:
        assert sha(Path(build['directory']) / 'engine' / name) == build['record']['artifacts'][name]

def check(value):
    assert value['passed'] is True and value['runtime'] in ['asyncify', 'jspi']
    assert value['family'] in ['chrome', 'firefox'] and value['browser']
    assert value['harnessSHA256'] == receipt['harnessSHA256'] and value['hostSHA256'] == receipt['hostSHA256']
    assert len(value['cases']) == len(host['results'])
    assert [case['id'] for case in value['cases']] == [item['id'] for item in host['results']]
    for case, item in zip(value['cases'], host['results']):
        assert case['sourceSHA256'] == item['sourceSHA256'] and case['referenceSHA256'] == item['outputSHA256']
        assert case['audioDecodedExact'] is True and case['videoDecodedExact'] is True
        assert case['profile'] == ('dts-hd' if item['codec'] == 'dts-hd' else 'truehd-mlp')
    assert not value.get('error') and not value.get('cleanupError')
    assert value['cleanup']['remainingProcessIDs'] == []

check(receipt)
results = []
for case, item in zip(receipt['cases'], host['results']):
    source = Path('build/provider-lossless-audio') / (item['id'] + '.mkv')
    reference = Path(item['output'])
    output = Path(receipt['outputRoot']) / ('codec-preparation-' + receipt['runtime'] + '-' + item['id'] + '.mp4')
    assert sha(source) == item['sourceSHA256'] and sha(reference) == item['outputSHA256']
    assert sha(output) == case['outputSHA256'] and output.stat().st_size == case['outputBytes']
    def decoded(path, audio):
        cmd = [str(ffmpeg), '-v', 'error', '-i', str(path), '-map', '0:a:0' if audio else '0:v:0',
               '-c:a' if audio else '-c:v', 'pcm_s32le' if audio else 'rawvideo', '-f', 'hash', '-hash', 'sha256', '-']
        return subprocess.check_output(cmd, env=environment, text=True, timeout=60).strip()
    audio = decoded(output, True); video = decoded(output, False)
    assert audio == decoded(reference, True) and video == decoded(reference, False)
    results.append({'id': item['id'], 'audioHash': audio, 'videoHash': video, 'outputSHA256': case['outputSHA256']})

mutations = [lambda r: r['cases'].pop(), lambda r: r['cases'][0].update(sourceSHA256='wrong'),
             lambda r: r['cases'][0].update(audioDecodedExact=False), lambda r: r.update(hostSHA256='wrong')]
for mutate in mutations:
    altered = copy.deepcopy(receipt); mutate(altered)
    try: check(altered)
    except (AssertionError, KeyError): pass
    else: raise AssertionError('Mutated receipt accepted')
with args.output.open('x') as out:
    json.dump({'status':'finite-codec-candidate-preservation-verified-not-release', 'runtime':receipt['runtime'],
               'browser':receipt['family'], 'verifierSHA256':sha(__file__), 'results':results,
               'negativeControls':len(mutations)}, out, indent=2); out.write('\n')

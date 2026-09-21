#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Summarize retained default/configured correctness runs without hiding failures."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import os

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--supersede', action='append', type=Path, default=[], help='Corrected-harness run that explicitly replaces matching cases while retaining prior evidence')
parser.add_argument('runs', nargs='+', type=Path)
args = parser.parse_args()
rows = {}
inputs = {}
counts = {}
labels = {'aac-mp4': 'H.264 + AAC / MP4', 'aac-mkv': 'H.264 + AAC / MKV',
          'pcm-mkv': 'H.264 + PCM24 / MKV', 'pcm-ass': 'H.264 + PCM24 / MKV + ASS'}
lanes = [('movi', 'default'), ('movi', 'native-first'), ('movi', 'shaka-first'), ('libmedia', 'default'), ('libmedia', 'prefer-mse'), ('libmedia', 'live'), ('libmedia', 'live-mse'), ('libmedia', 'webcodecs-off'), ('libmedia', 'file-input')]

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def outcome(c, specialist):
    if c['status'] == 'passed':
        return 'Pass*' if specialist else 'Pass'
    if c.get('screenPassed') and c['status'] == 'blocked':
        return 'Pass*'
    if c['status'] == 'blocked':
        return 'Not tested'
    return ('Plays; fails ' if c.get('initialPlaybackPassed') else 'Fails ') + c.get('failureStage', 'unspecified check')

for run in [*args.runs, *args.supersede]:
    manifest = json.loads((run / 'manifest.json').read_text())
    for name, expected in manifest['sha256'].items():
        assert digest(run / name) == expected, f'Changed evidence: {run / name}'
    summary = json.loads((run / 'summary.json').read_text())
    assert summary.get('finishedAt') and not summary.get('interrupted'), f'Incomplete: {run}'
    assert all(c['status'] in ('passed', 'failed', 'blocked') for c in summary['cases'])
    if summary['kind'] == 'correctness':
        assert set(summary['selected']) == {c['id'] for c in summary['cases']}
    inputs[str(run)] = {'summarySHA256': digest(run / 'summary.json'), 'manifestSHA256': digest(run / 'manifest.json'),
                        'browser': summary.get('browserIdentity', summary.get('browser')), 'command': summary.get('command')}
    specialist = summary['kind'] == 'specialist-basic-screen'
    fixtures_path = run / ('fixtures.json' if specialist else 'files/harness/matrix.json')
    fixtures = json.loads(fixtures_path.read_text())
    if not specialist:
        fixtures = fixtures['fixtures']
    for c in summary['cases']:
        key = (c['player'], c['lane'])
        if key not in lanes:
            continue
        fixture = c['fixture']
        if fixture == 'pcm-ass' and not fixtures[fixture].get('label'):
            fixture = 'original-pcm-ass'
        label = labels.get(c['fixture'], fixtures[c['fixture']].get('label') or rows.get(fixture, {}).get('label') or fixture)
        if fixture == 'original-pcm-ass':
            label += ' (original; native-first uses host ASS)'
        record = c.get('recordPath')
        link = os.path.relpath(run / record if record else run / 'summary.json', args.output)
        item = {'outcome': outcome(c, specialist), 'status': c['status'], 'screenPassed': bool(c.get('screenPassed')),
                'initialPlaybackPassed': bool(c.get('initialPlaybackPassed')), 'failureStage': c.get('failureStage'),
                'reason': c.get('reason', '').split('\n')[0], 'route': (c.get('initial') or c.get('failureState') or {}).get('route'),
                'evidence': link, 'case': c['id'], 'run': str(run)}
        # Real-bitstream specialist cases replace catalogue fixture-preparation blockers.
        row = rows.setdefault(fixture, {'label': label, 'results': {}})
        lane = '.'.join(key)
        if lane in row['results'] and row['results'][lane]['outcome'] != 'Not tested':
            if run not in args.supersede:
                raise ValueError(f'Duplicate tested case: {fixture} {lane}')
            item['supersedes'] = row['results'][lane]
        row['label'] = label
        row['results'][lane] = item

args.output.mkdir(parents=True, exist_ok=False)
lines = ['<!-- SPDX-License-Identifier: CC-BY-4.0 -->', '', '# Default and configured playback results', '',
         'Movi 0.4.0 and libmedia AVPlayer 1.3.1, headed Chrome on macOS. The same fixture is tested in each configuration, with a fresh browser per case. No CPU measurements were collected.', '',
         'Movi native-first uses `engine="native wasm"` with the pinned slim bundle. Movi Shaka-first uses `engine="shaka dashjs hlsjs wasm native"` for manifests. AVPlayer MSE preference uses `checkUseMSE: () => true`; it can still select its custom pipeline. These are tested alternatives, not an exhaustive search of every setting.', '',
         '**Pass** means the complete bounded check passed. **Pass with fidelity limits (Pass*)** means those checks passed but surround/HDR or real-bitstream fidelity remains unqualified. **Plays; fails …** means initial video/audio checks passed before a later check failed. **Fails …** identifies the first failing stage; later stages were not reached. **Not tested** means fixture preparation was blocked. No failure alone establishes an unsupported codec or a confirmed library defect.', '',
         'The original PCM24 + ASS native-first case uses an explicit host libass overlay. The expanded `pcm-ass` case uses built-in subtitle integration; they are reported separately when supplied as separate runs. Embedded-subtitle tests do not gain a host renderer merely by selecting native-first.', '',
         'Movi subtitle selection uses its public language API for external tracks and its exposed subtitle menu for embedded tracks. Child `<track>` elements are attached before Movi connects, so its initial parser sees external tracks. The earlier adapter appended them after connection and used an HTML `textTracks` facade that did not select embedded tracks; explicitly supplied corrected runs supersede those observations, retaining the earlier record in `summary.json`. AVPlayer uses public stream-ID selection; per-case records retain the selected ID, including cases where selection failed.', '',
         'Streaming audio observation includes detached HTML media elements created by wrappers that draw video onto canvas. Earlier DOM-only observations could miss that audio. Corrected streaming reruns explicitly supersede those results; no audio or image threshold was relaxed.', '',
         '## Outcomes by configuration', '', '| Configuration | Pass | Pass* | Failed check | Not tested |', '| --- | ---: | ---: | ---: | ---: |']
for player, lane in lanes:
    key = player + '.' + lane
    counts[key] = dict(Counter('failed' if v['results'][key]['outcome'].startswith(('Plays;', 'Fails ')) else v['results'][key]['outcome'] for v in rows.values() if key in v['results']))
    c = counts[key]
    lines.append(f"| {key} | {c.get('Pass',0)} | {c.get('Pass*',0)} | {c.get('failed',0)} | {c.get('Not tested',0)} |")
failure_stages = {}
lines += ['', '## What failed', '', 'Counts below describe failed checks, not unsupported formats. A shared lifecycle problem can fail many codec/container rows.', '', '| Configuration | Failed checks | Initial playback verified before failure | First failing stages |', '| --- | ---: | ---: | --- |']
for player, lane in lanes:
    key = player + '.' + lane
    failed = [row['results'][key] for row in rows.values() if key in row['results'] and row['results'][key]['status'] == 'failed']
    stages = Counter(c['failureStage'] or 'unspecified' for c in failed)
    failure_stages[key] = dict(stages)
    description = ', '.join(f'{stage}: {count}' for stage, count in stages.most_common()) or 'None'
    lines.append(f"| {key} | {len(failed)} | {sum(c['initialPlaybackPassed'] for c in failed)} | {description} |")
lines += ['', '## Per-fixture results', '', '| Media | Movi default | Movi native-first | Movi Shaka-first (manifests) | AVPlayer default | AVPlayer MSE preference |', '| --- | --- | --- | --- | --- | --- |']
for fixture, row in rows.items():
    cells = []
    for player, lane in lanes[:5]:
        c = row['results'].get(player+'.'+lane)
        cells.append(f"[{c['outcome']}]({c['evidence']})" if c else 'Not run')
    lines.append('| '+row['label']+' | '+' | '.join(cells)+' |')
lines += ['', '## Explicit AVPlayer live options', '', '`live` passes `isLive: true` to `load`; `live-mse` additionally requests MSE. These are additional configurations of the sliding-window HLS fixture.', '', '| Media | Live option | Live + MSE preference |', '| --- | --- | --- |']
for fixture, row in rows.items():
    if not any('libmedia.'+lane in row['results'] for lane in ['live','live-mse']):
        continue
    cells=[]
    for lane in ['live','live-mse']:
        c=row['results'].get('libmedia.'+lane)
        cells.append(f"[{c['outcome']}]({c['evidence']})" if c else 'Not run')
    lines.append('| '+row['label']+' | '+' | '.join(cells)+' |')
lines += ['', '## Additional AVPlayer alternatives', '',
          '`webcodecs-off` sets `enableWebCodecs: false`; it does not force MSE off or guarantee a particular decoder. `file-input` fetches the complete unchanged media bytes before passing a File to load. This is a full-download integration, not streaming or bounded-memory playback. Only the listed combinations were tested.', '',
          '| Media | WebCodecs off | Full File input |', '| --- | --- | --- |']
for fixture, row in rows.items():
    if not any('libmedia.'+lane in row['results'] for lane in ['webcodecs-off', 'file-input']):
        continue
    cells=[]
    for lane in ['webcodecs-off', 'file-input']:
        c=row['results'].get('libmedia.'+lane)
        cells.append(f"[{c['outcome']}]({c['evidence']})" if c else 'Not run')
    lines.append('| '+row['label']+' | '+' | '.join(cells)+' |')
lines += ['', 'AVPlayer EOF reruns use its public ended event before checking the terminal region and settled timeline. The previous duration-only trigger could run the settling check too early for timestamp-offset TS. Earlier results are retained under supersedes. See the [AVPlayer audit](../../../docs/HEAD-TO-HEAD-AVPLAYER.md) for counterfactual observations and input-sensitive failures.']
lines += ['', '## Evidence', '']
for run in inputs:
    lines.append(f'- [{run}]({os.path.relpath(Path(run)/"summary.json",args.output)})')
(args.output/'REPORT.md').write_text('\n'.join(lines)+'\n')
(args.output/'summary.json').write_text(json.dumps({'inputs': inputs, 'counts': counts, 'failureStages': failure_stages, 'fixtures': rows}, indent=2)+'\n')
(args.output/'report-configured-alternatives.py').write_bytes(Path(__file__).read_bytes())
(args.output/'manifest.json').write_text(json.dumps({'sha256': {p.name:digest(p) for p in args.output.iterdir() if p.is_file()}},indent=2)+'\n')
print(json.dumps(counts, indent=2))

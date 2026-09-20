#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Render each player's CPU relative to native video from retained matched rounds."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('cpu_report', Path(__file__).with_name('report-cpu-baseline.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
PLAYERS = [('video', 'Native video'), ('demuxe', 'Demuxe (auto)'), ('movi', 'Movi'), ('libmedia', 'AVPlayer')]
IDENTITY = ('assetsSHA256', 'harnessSHA256', 'browserIdentity')


def cell(result, player):
    if result['status'] == 'failed':
        return '🔴 (Fail)'
    if result['status'] != 'measured':
        if result.get('playbackPassed') and not result.get('fidelityLimited'):
            return '🟢 (Pass)'
        return ('🟡' if result.get('fidelityLimited') else '⚪') + ' (N/A)'
    if player == 'video':
        return '🔵 (Pass)'
    if result['minGainPercent'] <= 0 <= result['maxGainPercent']:
        return '🔵 (Pass)'
    return ('🟢' if result['medianGainPercent'] > 0 else '🟠') + f" ({result['medianGainPercent']:+.1f}%)"


def compare(key, player, correctness, performance, fixture):
    result = compare_cpu(key, player, correctness, performance, fixture)
    own = correctness.get((key, player))
    result['playbackPassed'] = bool(own and own[1]['status'] == 'passed'
                                  and not fixture.get('blockedReason')
                                  and not fixture.get('qualificationLimit'))
    return result


def compare_cpu(key, player, correctness, performance, fixture):
    own = correctness.get((key, player))
    if own and own[1]['status'] == 'failed':
        return {'status': 'failed', 'reason': own[1].get('reason', 'Playback correctness failed').splitlines()[0]}
    limit = fixture.get('blockedReason') or fixture.get('qualificationLimit')
    if limit:
        return {'status': 'unmeasured', 'reason': limit, 'fidelityLimited': bool(fixture.get('qualificationLimit'))}
    keys = [(key, player), (key, 'video')]
    for pk in keys:
        proof = correctness.get(pk)
        if not proof or proof[1]['status'] != 'passed':
            return {'status': 'unmeasured', 'reason': f'{pk[1]}: no passing matching correctness'}
    groups = [performance.get(pk, []) for pk in keys]
    if not all(groups):
        return {'status': 'unmeasured', 'reason': 'Missing player or native performance rounds'}
    for pk, group in zip(keys, groups):
        for identity, _ in group:
            if any(identity.get(k) != correctness[pk][0].get(k) for k in IDENTITY):
                return {'status': 'unmeasured', 'reason': 'Correctness/performance identities differ'}
    if any(groups[0][0][0].get(k) != groups[1][0][0].get(k) for k in IDENTITY):
        return {'status': 'unmeasured', 'reason': 'Player/native identities differ'}
    # Reuse the established signed, matched-round aggregation; rename its historical
    # Demuxe field names because the subject can now be any player.
    result = base.comparison(*[[c for _, c in group] for group in groups])
    if result['status'] == 'measured':
        result['playerMedianCPU'] = result.pop('demuxeMedianCPU')
        for pair in result['pairs']:
            pair['playerOneCorePercent'] = pair.pop('demuxeOneCorePercent')
            pair['playerRecord'] = pair.pop('demuxeRecord')
    else:
        reasons = [c.get('reason', '').splitlines()[0] for g in groups for _, c in g if c.get('reason') and c['status'] != 'passed']
        if reasons:
            result['reason'] = '; '.join(dict.fromkeys(reasons))
    return result


def render(args):
    source = Path(args.source).resolve()
    manifest = json.loads((source / 'manifest.json').read_text())
    for name, digest in manifest['sha256'].items():
        assert hashlib.sha256((source / name).read_bytes()).hexdigest() == digest, name
    prior = json.loads((source / 'summary.json').read_text())
    inputs = json.loads((source / 'inputs.json').read_text())
    correctness, performance = {}, {}
    for name in prior['runs']:
        run = ROOT / name
        for filename in ['summary', 'manifest']:
            assert hashlib.sha256((run / (filename + '.json')).read_bytes()).hexdigest() == inputs[name][filename + 'SHA256']
        subprocess.run(['node', str(ROOT / 'tests/head-to-head/verify.mjs'), str(run)], check=True, stdout=subprocess.DEVNULL)
        data = json.loads((run / 'summary.json').read_text())
        for c in data['cases']:
            if c['lane'] not in ('default', 'auto'):
                continue
            key = (c['fixture'], c['player'])
            if data['kind'] == 'correctness':
                correctness[key] = (data, c)
            else:
                c = dict(c, recordPath=str((run / c['recordPath']).relative_to(ROOT)))
                performance.setdefault(key, []).append((data, c))
    fixtures = json.loads((ROOT / prior['assets'] / 'fixtures/catalogue.json').read_text())
    rows = [{'fixture': r['fixture'], 'label': r['label'], 'players': {
        p: compare(r['fixture'], p, correctness, performance, fixtures.get(r['fixture'], {})) for p, _ in PLAYERS
    }} for r in prior['rows']]
    table = ['| Media format | ' + ' | '.join(title for _, title in PLAYERS) + ' |', '| --- | --- | --- | --- | --- |']
    table += ['| ' + r['label'] + ' | ' + ' | '.join(cell(r['players'][p], p) for p, _ in PLAYERS) + ' |' for r in rows]
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=False)
    explanation = ('Each player is compared with native video: `100 × (native CPU − player CPU) / native CPU`. '
                   'Positive means lower CPU; negative means higher. Medians use three matched rounds. '
                   'Blue `(Pass)` means the measured round range includes zero, not proven equivalence; native is its own reference. '
                   'Green `(Pass)` means playback passed but a valid CPU comparison is unavailable; it makes no CPU-equivalence claim. '
                   '`(Fail)` means default playback correctness failed. N/A includes absent or rejected performance evidence; '
                   'it does not imply equal CPU. Green = lower CPU, orange = higher, blue = Pass, red = Fail, '
                   'yellow = fidelity-limited, white = unavailable comparison. '
                   'Pinned Chrome/macOS shared-host synthetic evidence; renderer counters do not certify equal physical smoothness. '
                   'Native in the original ASS case includes the host ASS renderer.')
    report = ['# CPU relative to native video', '', explanation, '', *table, '', '## Values, ranges and exclusions', '',
              '| Media / player | CPU: player / native (% of one core) | Median gain; range | Evidence or reason |', '| --- | --- | --- | --- |']
    for r in rows:
        for p, title in PLAYERS:
            c = r['players'][p]
            if c['status'] == 'measured':
                links = ' · '.join(f"[round {x['round']}]({os.path.relpath(ROOT / x['playerRecord'], out)})" for x in c['pairs'])
                report.append(f"| {r['label']} / {title} | {c['playerMedianCPU']:.2f} / {c['baselineMedianCPU']:.2f} | {c['medianGainPercent']:+.1f}%; {c['minGainPercent']:+.1f} to {c['maxGainPercent']:+.1f}% | {links} |")
            else:
                report.append(f"| {r['label']} / {title} | — | {cell(c, p)} | {c['reason'].replace('|', '/')} |")
    (out / 'REPORT.md').write_text('\n'.join(report) + '\n')
    summary = {'formula': '100 * (native CPU - player CPU) / native CPU', 'source': str(source.relative_to(ROOT)), 'rows': rows}
    (out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    (out / 'files').mkdir()
    for name in ['render-native-cpu-table.py', 'report-cpu-baseline.py']:
        shutil.copyfile(Path(__file__).with_name(name), out / 'files' / name)
    (out / 'inputs.json').write_text(json.dumps({'sourceManifestSHA256': hashlib.sha256((source / 'manifest.json').read_bytes()).hexdigest(), 'runs': inputs}, indent=2) + '\n')
    (out / 'manifest.json').write_text(json.dumps({'sha256': {str(p.relative_to(out)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}}, indent=2) + '\n')
    if args.update_readme:
        readme = ROOT / 'README.md'
        text = readme.read_text()
        marker = 'The table uses the recorded CPU campaign'
        start = text.index(marker if marker in text else 'The original four combinations')
        end = text.index('\nSee [versions, evidence, and configured alternatives]', start)
        introduction = ('The table uses the recorded CPU campaign and its matching playback checks. '
                        'Detailed routes, historical outcomes and tested alternatives remain in the '
                        '[complete-file catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md).\n\n' + explanation + '\n\n' +
                        f'[Raw values, ranges and exclusions]({out.relative_to(ROOT)}/REPORT.md) · '
                        '[Measurement protocol](docs/CPU-BASELINE.md).\n\n')
        readme.write_text(text[:start] + introduction + '\n'.join(table) + '\n' + text[end:])
    print(json.dumps({'rows': len(rows), 'measuredNonReferenceCells': sum(c['status'] == 'measured' for r in rows for p, c in r['players'].items() if p != 'video'), 'report': str(out)}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--update-readme', action='store_true')
    render(parser.parse_args())

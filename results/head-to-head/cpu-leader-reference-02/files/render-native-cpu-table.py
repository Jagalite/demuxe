#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Render each player's CPU relative to the lowest-CPU eligible player per fixture."""
import argparse
import hashlib
import importlib.util
import json
import os
import re
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
    if result.get('screeningPassed'):
        return '🟢 (Pass)*'
    if result['status'] != 'measured':
        if result.get('playbackPassed') and not result.get('fidelityLimited'):
            return '🟢 (Pass)'
        return ('🟡' if result.get('fidelityLimited') else '⚪') + ' (N/A)'
    gain = result.get('gainPercent', result['medianGainPercent'])
    if gain == 0:
        return '🟢 (0%)'
    return ('🟢' if gain > 0 else '🟠') + f" ({gain:+.1f}%)"


def compare(key, player, correctness, performance, fixture, historical=None, baseline="video"):
    result = compare_cpu(key, player, correctness, performance, fixture, baseline)
    result['referencePlayer'] = baseline
    own = correctness.get((key, player))
    if not own and fixture.get('qualificationLimit') and not fixture.get('blockedReason') and historical:
        record = historical.get((key, player))
        if record:
            result['historicalPlaybackRecord'] = record['recordPath']
            if record['status'] == 'failed':
                result.update(status='failed', reason=record.get('reason', 'Historical playback failed').splitlines()[0])
            elif record['status'] == 'blocked' and record.get('screenPassed'):
                result['screeningPassed'] = True
    result['playbackPassed'] = bool(own and own[1]['status'] == 'passed'
                                  and not fixture.get('blockedReason')
                                  and not fixture.get('qualificationLimit'))
    return result


def compare_cpu(key, player, correctness, performance, fixture, baseline="video"):
    own = correctness.get((key, player))
    if own and own[1]['status'] == 'failed':
        return {'status': 'failed', 'reason': own[1].get('reason', 'Playback correctness failed').splitlines()[0]}
    limit = fixture.get('blockedReason') or fixture.get('qualificationLimit')
    if limit:
        return {'status': 'unmeasured', 'reason': limit, 'fidelityLimited': bool(fixture.get('qualificationLimit'))}
    if baseline is None:
        return {'status': 'unmeasured', 'reason': 'No eligible measured reference player'}
    keys = [(key, player), (key, baseline)]
    for pk in keys:
        proof = correctness.get(pk)
        if not proof or proof[1]['status'] != 'passed':
            return {'status': 'unmeasured', 'reason': f'{pk[1]}: no passing matching correctness'}
    groups = [performance.get(pk, []) for pk in keys]
    if not all(groups):
        return {'status': 'unmeasured', 'reason': 'Missing player or reference performance rounds'}
    for pk, group in zip(keys, groups):
        for identity, _ in group:
            if any(identity.get(k) != correctness[pk][0].get(k) for k in IDENTITY):
                return {'status': 'unmeasured', 'reason': 'Correctness/performance identities differ'}
    if any(groups[0][0][0].get(k) != groups[1][0][0].get(k) for k in IDENTITY):
        return {'status': 'unmeasured', 'reason': 'Player/reference identities differ'}
    # Reuse the established signed, matched-round aggregation; rename its historical
    # Demuxe field names because the subject can now be any player.
    result = base.comparison(*[[c for _, c in group] for group in groups])
    if result['status'] == 'measured':
        result['playerMedianCPU'] = result.pop('demuxeMedianCPU')
        result['gainPercent'] = 100 * (result['baselineMedianCPU'] - result['playerMedianCPU']) / result['baselineMedianCPU']
        for pair in result['pairs']:
            pair['playerOneCorePercent'] = pair.pop('demuxeOneCorePercent')
            pair['playerRecord'] = pair.pop('demuxeRecord')
    else:
        reasons = [c.get('reason', '').splitlines()[0] for g in groups for _, c in g if c.get('reason') and c['status'] != 'passed']
        if reasons:
            result['reason'] = '; '.join(dict.fromkeys(reasons))
    return result




def select_leader(key, correctness, performance, fixture):
    eligible = {}
    for player, _ in PLAYERS:
        result = compare_cpu(key, player, correctness, performance, fixture, player)
        if result['status'] == 'measured':
            eligible[player] = result
    if not eligible:
        return None
    # A shared reference requires the same frozen profile and matched round set.
    profiles = {tuple(performance[(key, p)][0][0].get(k) for k in IDENTITY)
                + (tuple(x['round'] for x in r['pairs']),) for p, r in eligible.items()}
    if len(profiles) != 1:
        return None
    # Equal medians use the stable displayed player order; no superiority claim.
    return min(eligible, key=lambda p: eligible[p]['playerMedianCPU'])


def load_historical_screening(fixtures, labels, correctness):
    """Use catalogue-owned records only for fidelity rows omitted by the CPU campaign."""
    catalogue = ROOT / 'docs/HEAD-TO-HEAD-CATALOGUE.md'
    records, verified, hashes = {}, set(), {}
    for line in catalogue.read_text().splitlines():
        if not line.startswith('| '):
            continue
        cells = [c.strip() for c in line.split('|')]
        key = labels.get(cells[1])
        if not key or not fixtures.get(key, {}).get('qualificationLimit'):
            continue
        player = cells[2]
        if (key, player) in correctness:
            continue
        match = re.search(r'\[record\]\(([^)]+)\)', line)
        if not match:
            continue
        path = (catalogue.parent / match[1]).resolve()
        run = path.parent.parent
        if run not in verified:
            subprocess.run(['node', str(ROOT / 'tests/head-to-head/verify.mjs'), str(run)], check=True, stdout=subprocess.DEVNULL)
            verified.add(run)
            hashes[str(run.relative_to(ROOT))] = hashlib.sha256((run / 'manifest.json').read_bytes()).hexdigest()
        record = json.loads(path.read_text())
        assert record['fixture'] == key and record['player'] == player
        assert record['lane'] in ('auto', 'default')
        records[(key, player)] = dict(record, recordPath=str(path.relative_to(ROOT)))
    return records, {'catalogueSHA256': hashlib.sha256(catalogue.read_bytes()).hexdigest(), 'manifestSHA256': hashes}


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
    historical, historical_inputs = load_historical_screening(fixtures, {r['label']: r['fixture'] for r in prior['rows']}, correctness)
    rows = []
    for r in prior['rows']:
        fixture = fixtures.get(r['fixture'], {})
        leader = select_leader(r['fixture'], correctness, performance, fixture)
        rows.append({'fixture': r['fixture'], 'label': r['label'], 'leader': leader, 'players': {
            p: compare(r['fixture'], p, correctness, performance, fixture, historical, leader) for p, _ in PLAYERS
        }})
    table = ['| Media format | ' + ' | '.join(title for _, title in PLAYERS) + ' |', '| --- | --- | --- | --- | --- |']
    table += ['| ' + r['label'] + ' | ' + ' | '.join(('**' + cell(r['players'][p], p) + '**' if p == r['leader'] else cell(r['players'][p], p)) for p, _ in PLAYERS) + ' |' for r in rows]
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=False)
    explanation = ('Each row uses the lowest-median-CPU eligible player among the four as its reference (**bold** cell): `100 × (leader median CPU − player median CPU) / leader median CPU`. '
                   'The leader is 0%; negative percentages mean higher CPU than the leader. Medians use three matched rounds. Only players with accepted matching measurements can lead; this is not a claim about unmeasured players or statistical superiority. '
                   'Every valid CPU comparison shows a percentage, including 0% for the leader, even when round ranges overlap. Green `(Pass)` means playback passed without a valid CPU comparison. '
                   'Neither `(Pass)` nor a rounded 0% establishes a statistical tie; ranges remain in the report. '
                   '`(Pass)*` means historical playback screening passed, but discrete surround or HDR/color fidelity remains unverified; no CPU gain is claimed. '
                   '`(Fail)` means default playback correctness failed. N/A means no demonstrated playback result for this scope; '
                   'it does not imply equal CPU. Green = Pass or lower CPU, orange = higher CPU, red = Fail, '
                   'white = unavailable playback evidence. '
                   'Pinned Chrome/macOS shared-host synthetic evidence; renderer counters do not certify equal physical smoothness. '
                   'Native in the original ASS case includes the host ASS renderer.')
    report = ['# CPU relative to the lowest-CPU eligible player', '', explanation, '', *table, '', '## Values, ranges and exclusions', '',
              '| Media / player | CPU: player / leader (% of one core) | Gain from medians; round range | Evidence or reason |', '| --- | --- | --- | --- |']
    for r in rows:
        for p, title in PLAYERS:
            c = r['players'][p]
            if c['status'] == 'measured':
                links = 'Reference: ' + dict(PLAYERS)[r['leader']] + ' · ' + ' · '.join(f"[round {x['round']}]({os.path.relpath(ROOT / x['playerRecord'], out)})" for x in c['pairs'])
                report.append(f"| {r['label']} / {title} | {c['playerMedianCPU']:.2f} / {c['baselineMedianCPU']:.2f} | {c['gainPercent']:+.1f}%; {c['minGainPercent']:+.1f} to {c['maxGainPercent']:+.1f}% | {links} |")
            else:
                evidence = f" · [historical playback]({os.path.relpath(ROOT / c['historicalPlaybackRecord'], out)})" if c.get('historicalPlaybackRecord') else ''
                report.append(f"| {r['label']} / {title} | — | {cell(c, p)} | {c['reason'].replace('|', '/')}{evidence} |")
    (out / 'REPORT.md').write_text('\n'.join(report) + '\n')
    summary = {'formula': '100 * (leader median CPU - player median CPU) / leader median CPU', 'leaderRule': 'Lowest median CPU among players with three accepted matching rounds; stable displayed order breaks exact ties', 'source': str(source.relative_to(ROOT)), 'rows': rows}
    (out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    (out / 'files').mkdir()
    for name in ['render-native-cpu-table.py', 'report-cpu-baseline.py']:
        shutil.copyfile(Path(__file__).with_name(name), out / 'files' / name)
    (out / 'inputs.json').write_text(json.dumps({'sourceManifestSHA256': hashlib.sha256((source / 'manifest.json').read_bytes()).hexdigest(), 'runs': inputs, 'historicalPlayback': historical_inputs}, indent=2) + '\n')
    (out / 'manifest.json').write_text(json.dumps({'sha256': {str(p.relative_to(out)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}}, indent=2) + '\n')
    if args.update_readme:
        readme = ROOT / 'README.md'
        text = readme.read_text()
        marker = 'The table uses the recorded CPU campaign'
        start = text.index(marker if marker in text else 'The original four combinations')
        end = text.index('\nSee [versions, evidence, and configured alternatives]', start)
        introduction = ('The table uses the recorded CPU campaign and its matching playback checks, plus catalogue playback screening for fidelity-limited rows excluded from that campaign. '
                        'Detailed routes, historical outcomes and tested alternatives remain in the '
                        '[complete-file catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md).\n\n' + explanation + '\n\n' +
                        f'[Raw values, ranges and exclusions]({out.relative_to(ROOT)}/REPORT.md) · '
                        '[Measurement protocol](docs/CPU-BASELINE.md).\n\n')
        readme.write_text(text[:start] + introduction + '\n'.join(table) + '\n' + text[end:])
    print(json.dumps({'rows': len(rows), 'measuredNonReferenceCells': sum(c['status'] == 'measured' for r in rows for p, c in r['players'].items() if p != r['leader']), 'report': str(out)}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--update-readme', action='store_true')
    render(parser.parse_args())

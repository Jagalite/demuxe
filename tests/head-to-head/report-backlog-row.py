#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Publish only observed cells from a verified, completed README row campaign."""
import argparse, json, pathlib, re, statistics, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
COLUMNS = {('video', 'default'): 1, ('demuxe', 'auto'): 2,
           ('demuxe', 'jspi'): 3, ('demuxe', 'asyncify'): 4,
           ('demuxe', 'software'): 5, ('movi', 'default'): 6,
           ('libmedia', 'default'): 7, ('mediabunny', 'default'): 8, ('videojs', 'default'): 9}
LANES = ['Native', 'Auto', 'JSPI', 'Asyncify', 'Software', 'Movi', 'AVPlayer', 'MediaBunny', 'Video.js']

def read_run(directory):
    directory = directory.resolve()
    subprocess.run(['node', str(ROOT/'tests/head-to-head/verify.mjs'), str(directory)], check=True)
    data = json.loads((directory/'summary.json').read_text())
    assert data.get('finishedAt') and not data.get('interrupted'), directory
    return data

def short(reason):
    text = str(reason).splitlines()[0].replace('|', '/')
    if 'Adapted file audio with external captions or manifests is not qualified' in text:
        return 'No qualified route: adapted file audio with external captions or manifests is not qualified'
    return text if len(text) <= 360 else text[:357]+'…'

def publish(args):
    proof = read_run(args.correctness)
    supplements = [read_run(p) for p in args.supplement]
    proofs = [proof]+supplements
    cpu_runs = [read_run(p) for p in args.cpu]
    cpu = {'cases': [c for run in cpu_runs for c in run['cases']]} if cpu_runs else None
    assert all(p['kind'] == 'correctness' for p in proofs)
    for run in cpu_runs:
        assert run['kind'] == 'performance'
        assert any(all(p[name] == run[name] for name in ['assetsSHA256', 'harnessSHA256', 'browserIdentity']) and
                   all(any(c['id'] == previous['id'] for previous in p['cases']) for c in run['cases']) for p in proofs), 'CPU must match its own correctness proof'
    all_cases = [c for p in proofs for c in p['cases']]
    proof_paths = {c['id']: directory for p, directory in zip(proofs, [args.correctness]+args.supplement) for c in p['cases']}
    cpu_paths = {c['id']: directory for run, directory in zip(cpu_runs, args.cpu) for c in run['cases']}
    assert len({c['id'] for c in all_cases}) == len(all_cases), 'Duplicate case proofs'
    fixtures = {c['fixture'] for c in all_cases}
    assert len(fixtures) == 1
    fixture = next(iter(fixtures))
    contract = json.loads((args.correctness/'files/harness/matrix.json').read_text())['fixtures'][fixture]
    readme = ROOT/'README.md'
    lines = readme.read_text().splitlines()
    indices = [i for i, line in enumerate(lines) if line.startswith('| ') and len(line.split('|')) == 12][2:]
    index = indices[args.row-1]
    cells = [c.strip() for c in lines[index].strip('|').split('|')]
    name = cells[0]
    details, todos, resolved = [], [], []
    for case in all_cases:
        proof_path = proof_paths[case['id']].relative_to(ROOT)
        column = COLUMNS[case['player'], case['lane']]
        lane = LANES[column-1]
        windows = [c for c in (cpu or {}).get('cases', []) if c['id'] == case['id']]
        accepted = [c for c in windows if c.get('measurement') and
                    (c['status'] == 'passed' or (c['status'] == 'blocked' and c.get('screenMeasured') and not c.get('failureStage')))]
        good = case['status'] == 'passed' or (case['status'] == 'blocked' and case.get('screenPassed') and not case.get('failureStage'))
        reason = short(case.get('reason', 'All bounded playback checks passed'))
        if case.get('runtimeObservations'):
            reason += '; observed routes: '+', '.join(o['route'] for o in case['runtimeObservations'])
        if case.get('runtimeBypass') and good:
            route = case.get('runtimeObservations', [{}])[0].get('route', 'native-direct')
            cell = f'N/A · {route} bypass'
        elif good:
            cell = '🟡 Screened*' if case.get('screenPassed') else '🟢 (Pass)'
            if len(windows) >= 3 and len(accepted) == len(windows) and len({c['round'] for c in windows}) == len(windows):
                values = [c['measurement']['oneCorePercent'] for c in accepted]
                cell += f' · {statistics.median(values):.1f}% CPU'
                reason += '; CPU rounds: ' + ', '.join(f'{v:.2f}%' for v in values)
                measured_route = accepted[0].get('samples', [{}])[0].get('state', {}).get('route')
                if measured_route:
                    reason += '; CPU route: '+measured_route
                if contract.get('audioTrackSwitches') and case['player'] == 'demuxe':
                    reason += '; CPU uses the initial '+str(case.get('initial', {}).get('selectedAudioTrack', {}).get('codec', 'default'))+' track'
                resolved.append((name, lane))
            else:
                cell += ' · CPU withheld' if windows else ' · CPU pending'
                failed = '; '.join(short(c.get('reason', 'No accepted measurement')) for c in windows if c not in accepted)
                if case.get('runtimeCPUApplicable') is False:
                    failed = 'Default playback bypasses the requested runtime; measure the explicitly selected remux/transcode track separately'
                if failed:
                    reason += '; CPU withheld: '+failed
                evidence_path = cpu_paths[case['id']].relative_to(ROOT) if windows else proof_path
                todos.append(f'| {name} | {lane} | {failed or "Matching CPU campaign still required"} | [Evidence](../{evidence_path}/summary.json) |')
        elif case['status'] == 'failed':
            cell = '🔴 (Fail)'
        else:
            cell = '— Blocked'
            if not case.get('forceRemux'):
                todos.append(f'| {name} | {lane} | {reason} | [Evidence](../{proof_path}/summary.json) |')
        if good and contract.get('audioTrackSwitches') and case['player'] != 'demuxe':
            cell += ' · default track'
            reason += '; alternate audio-track selection was not exercised'
        if good and fixture == 'pcm-ass' and case['player'] == 'video':
            cell += ' · host libass'
            reason += '; external ASS uses the documented host libass integration'
        if case.get('forceRemux'):
            cell += ' · forced-remux ref'
            if not good:
                todos.append(f'| {name} | {lane} | CPU withheld: forced playback did not qualify; {reason} | [Evidence](../{proof_path}/summary.json) |')
        cells[column] = cell
        details.append(f'| {lane} | {cell} | {reason} |')
    lines[index] = '| ' + ' | '.join(cells) + ' |'
    readme.write_text('\n'.join(lines)+'\n')
    report = ROOT/'docs/README-BACKLOG-RESULTS.md'
    if not report.exists():
        report.write_text('<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n# README backlog row results\n\n'
            'Rows are exercised in README order. Existing cells outside each selected gap retain their original campaigns. '
            'Video.js 8.24.1 uses its default HTML5/VHS player, local URL input, no codec plugins, and hidden controls. '
            'Its public [Player API](https://docs.videojs.com/player) drives the same bounded checks as the other maintained adapters. '
            'The pinned package URL and SHA-256 are captured in each asset manifest.\n\n'
            'Demuxe uses the frozen September 28 source candidate based on `7f4407d2` plus captured local changes; '
            'this is not a clean release qualification. Private engine additions are separately hashed. '
            'JSPI/Asyncify run without isolation headers; a direct-playback bypass exercises neither remux runtime. '
            'CPU requires matching correctness, three accepted windows, foreground, stable processes, '
            'presentation cadence and cleanup. One gated Chrome launch per row uses fresh contexts for each arm; '
            'its three rounds do not establish independent-launch reproducibility.\n')
    text = report.read_text()
    heading = f'## Row {args.row}: {name}'
    if args.attempt:
        heading += ' — '+args.attempt
    assert heading not in text, 'Row already published'
    evidence = f'[Correctness](../{args.correctness.relative_to(ROOT)}/summary.json)'
    for i, directory in enumerate(args.supplement, 1):
        evidence += f' · [Supplement {i}](../{directory.relative_to(ROOT)}/summary.json)'
    for i, directory in enumerate(args.cpu, 1):
        evidence += f' · [CPU {i}](../{directory.relative_to(ROOT)}/summary.json)'
    text += '\n'+heading+'\n\n'+evidence+'\n\n| Lane | Result | Observation |\n| --- | --- | --- |\n'+'\n'.join(details)+'\n'
    report.write_text(text)
    backlog = ROOT/'docs/README-TESTING-BACKLOG.md'
    text = backlog.read_text()
    if '## Top-to-bottom campaign' not in text:
        text = text.replace('## Summary', '## Top-to-bottom campaign\n\n'
            'The [row results](README-BACKLOG-RESULTS.md) record fresh gap tests in README order. '
            'The sections below retain the initial inventory; the summary counts track the current table.\n\n'
            '### TODO: CPU withheld or follow-up required in this campaign\n\n'
            '| Row | Lane | Remaining work / rejected gate | Evidence |\n| --- | --- | --- | --- |\n\n## Summary')
    if todos:
        text = text.replace('\n\n## Summary', '\n'+'\n'.join(todos)+'\n\n## Summary', 1)
    if resolved:
        before, after = text.split('\n## Summary', 1)
        before = '\n'.join(line for line in before.split('\n') if not any(line.startswith(f'| {row} | {lane} |') for row, lane in resolved))
        text = before+'\n## Summary'+after
    rows = [[c.strip() for c in line.strip('|').split('|')] for line in lines if line.startswith('| ') and len(line.split('|')) == 12][2:]
    total_untested = total_missing = green = yellow = 0
    for i, lane in enumerate(LANES, 1):
        column = [r[i] for r in rows]
        untested = sum('Untested' in c or c == '—' for c in column)
        missing = sum(('🟢' in c or '🟡' in c) and not re.search(r'\d+(?:\.\d+)?% CPU', c) for c in column)
        green += sum('🟢' in c and not re.search(r'\d+(?:\.\d+)?% CPU', c) for c in column)
        yellow += sum('🟡' in c and not re.search(r'\d+(?:\.\d+)?% CPU', c) for c in column)
        counts = [untested, missing, sum('Unqualified' in c for c in column), sum('🔴' in c for c in column), sum('🟠' in c for c in column)]
        text = re.sub(r'^\| '+re.escape(lane)+r' \|.*$', '| '+lane+' | '+' | '.join(map(str, counts))+' |', text, flags=re.M)
        total_untested += untested
        total_missing += missing
    text = re.sub(r'There are \*\*\d+ untested cells\*\* and \*\*\d+ passing/screened cells without published CPU\*\* \([^)]*\)',
        f'There are **{total_untested} untested cells** and **{total_missing} passing/screened cells without published CPU** ({green} green passes and {yellow} yellow screens)', text)
    backlog.write_text(text)
    print(f'Published row {args.row}: {fixture}; {total_untested} untested cells remain')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--row', type=int, required=True)
    parser.add_argument('--correctness', type=lambda s: pathlib.Path(s).resolve(), required=True)
    parser.add_argument('--cpu', type=lambda s: pathlib.Path(s).resolve(), action='append', default=[])
    parser.add_argument('--supplement', type=lambda s: pathlib.Path(s).resolve(), action='append', default=[])
    parser.add_argument('--attempt')
    publish(parser.parse_args())

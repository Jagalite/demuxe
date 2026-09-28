#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Publish only observed cells from a verified, completed README row campaign."""
import argparse, json, pathlib, re, statistics, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
COLUMNS = {('video', 'default'): 1, ('demuxe', 'auto'): 2,
           ('demuxe', 'jspi'): 3, ('demuxe', 'asyncify'): 4,
           ('demuxe', 'software'): 5, ('movi', 'default'): 6,
           ('libmedia', 'default'): 7, ('videojs', 'default'): 9}
LANES = ['Native', 'Auto', 'JSPI', 'Asyncify', 'Software', 'Movi', 'AVPlayer', 'MediaBunny', 'Video.js']

def read_run(directory):
    directory = directory.resolve()
    subprocess.run(['node', str(ROOT/'tests/head-to-head/verify.mjs'), str(directory)], check=True)
    data = json.loads((directory/'summary.json').read_text())
    assert data.get('finishedAt') and not data.get('interrupted'), directory
    return data

def short(reason):
    return str(reason).splitlines()[0].replace('|', '/')

def publish(args):
    proof = read_run(args.correctness)
    cpu = read_run(args.cpu) if args.cpu else None
    assert proof['kind'] == 'correctness'
    if cpu:
        assert cpu['kind'] == 'performance'
        for name in ['assetsSHA256', 'harnessSHA256', 'browserIdentity']:
            assert proof[name] == cpu[name], name
    fixtures = {c['fixture'] for c in proof['cases']}
    assert len(fixtures) == 1
    fixture = next(iter(fixtures))
    readme = ROOT/'README.md'
    lines = readme.read_text().splitlines()
    indices = [i for i, line in enumerate(lines) if line.startswith('| ') and len(line.split('|')) == 12][2:]
    index = indices[args.row-1]
    cells = [c.strip() for c in lines[index].strip('|').split('|')]
    name = cells[0]
    details, todos = [], []
    for case in proof['cases']:
        column = COLUMNS[case['player'], case['lane']]
        lane = LANES[column-1]
        windows = [c for c in (cpu or {}).get('cases', []) if c['id'] == case['id']]
        accepted = [c for c in windows if c['status'] == 'passed' and c.get('measurement')]
        good = case['status'] == 'passed' or (case['status'] == 'blocked' and case.get('screenPassed') and not case.get('failureStage'))
        reason = short(case.get('reason', 'All bounded playback checks passed'))
        if case.get('runtimeBypass') and good:
            cell = 'N/A · native-direct bypass'
        elif good:
            cell = '🟡 Screened*' if case.get('screenPassed') else '🟢 (Pass)'
            if len(windows) >= 3 and len(accepted) == len(windows):
                values = [c['measurement']['oneCorePercent'] for c in accepted]
                cell += f' · {statistics.median(values):.1f}% CPU'
                reason += '; CPU rounds: ' + ', '.join(f'{v:.2f}%' for v in values)
            else:
                cell += ' · CPU withheld' if windows else ' · CPU pending'
                failed = '; '.join(short(c.get('reason', 'No accepted measurement')) for c in windows if c not in accepted)
                todos.append(f'| {name} | {lane} | {failed or "Matching CPU campaign still required"} | [Evidence](../{args.correctness.relative_to(ROOT)}/summary.json) |')
        elif case['status'] == 'failed':
            cell = '🔴 (Fail)'
        else:
            cell = '— Blocked'
            todos.append(f'| {name} | {lane} | {reason} | [Evidence](../{args.correctness.relative_to(ROOT)}/summary.json) |')
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
    assert heading not in text, 'Row already published'
    evidence = f'[Correctness](../{args.correctness.relative_to(ROOT)}/summary.json)'
    if cpu:
        evidence += f' · [CPU](../{args.cpu.relative_to(ROOT)}/summary.json)'
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
    parser.add_argument('--cpu', type=lambda s: pathlib.Path(s).resolve())
    publish(parser.parse_args())

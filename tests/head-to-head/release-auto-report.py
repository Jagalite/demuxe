#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Render fresh Auto rows and separately labeled failed-player CPU attempts."""
import argparse
import hashlib
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ALIASES = {'H.264 + PCM24 / MKV + external ASS': 'H.264 + PCM24 / MKV + ASS'}


def read(path):
    return json.loads(Path(path).read_text())


def first_reason(record):
    return str(record.get('reason') or record.get('failureStage') or '').splitlines()[0]


def identity(a, b):
    for key in ('assetsSHA256', 'harnessSHA256', 'browserIdentity'):
        if a.get(key) != b.get(key):
            raise ValueError(f'Mismatched {key}: {a.get(key)} / {b.get(key)}')


def load_pair(paths, records, measurements, labels, *, diagnostic=False):
    correctness, performance = map(read, paths)
    assert correctness['kind'] == 'correctness' and performance['kind'] == 'performance'
    identity(correctness, performance)
    assert correctness.get('controlledStreaming') == performance.get('controlledStreaming')
    fixtures = read(Path(correctness['assets']) / 'fixtures/catalogue.json')
    for key, fixture in fixtures.items():
        label = ALIASES.get(fixture['label'], fixture['label'])
        if label in labels and labels[label] != key:
            raise ValueError(f'Duplicate media label: {label}')
        labels[label] = key
    for case in correctness['cases']:
        if case['lane'] in ('default', 'auto'):
            records[(case['fixture'], case['player'])] = (correctness, case)
    grouped = {}
    for case in performance['cases']:
        if case['lane'] in ('default', 'auto'):
            grouped.setdefault((case['fixture'], case['player']), []).append(case)
    for key, cases in grouped.items():
        measurements[key] = (performance, cases, diagnostic)


def cpu(record, data, *, diagnostic=False):
    if not data:
        return None, 'No matching CPU attempt'
    run, cases, is_diagnostic = data
    if is_diagnostic != diagnostic:
        return None, 'CPU run has the wrong qualification scope'
    identity(record[0], run)
    field = 'diagnosticMeasurement' if diagnostic else 'measurement'
    accepted = [case[field]['oneCorePercent'] for case in cases
                if (diagnostic or case['status'] == 'passed') and case.get(field)
                and isinstance(case[field].get('oneCorePercent'), (int, float))]
    if not diagnostic and (len(accepted) < 3 or len({case['round'] for case in cases if case.get(field)}) < 3
                           or any(case['status'] != 'passed' for case in cases)):
        return None, 'Three complete accepted rounds required'
    if not accepted:
        return None, 'CPU attempted; no stable process window'
    return {'median': statistics.median(accepted), 'min': min(accepted), 'max': max(accepted),
            'rounds': len(accepted), 'records': [case['recordPath'] for case in cases],
            'diagnostic': diagnostic}, None


def route(case):
    diagnostics = (case.get('initial') or {}).get('diagnostics') or {}
    return (diagnostics.get('plan') or {}).get('id') or case.get('initial', {}).get('route') or 'unavailable'


def render(args):
    records, measurements, labels = {}, {}, {}
    for pair in args.campaign:
        load_pair(pair, records, measurements, labels)
    competitor_records, diagnostics, ignored = {}, {}, {}
    for pair in args.competitor:
        load_pair(pair, competitor_records, diagnostics, ignored, diagnostic=True)
    readme = (ROOT / 'README.md').read_text()
    media_lines = [line for line in readme.splitlines() if line.startswith('| ') and line.count('|') >= 7
                   and line.split('|')[1].strip() in labels]
    if len(media_lines) != 80:
        raise ValueError(f'Expected 80 mapped README media rows; found {len(media_lines)}')
    rows = {}
    for line in media_lines:
        label = line.split('|')[1].strip()
        key = labels[label]
        if (key, 'demuxe') not in records:
            raise ValueError(f'No fresh Auto correctness record: {label}')
        proof = records[(key, 'demuxe')]
        case = proof[1]
        value, missing = cpu(proof, measurements.get((key, 'demuxe')))
        row = {'fixture': key, 'label': label, 'auto': {'status': case['status'], 'route': route(case),
               'screenPassed': bool(case.get('screenPassed')), 'reason': first_reason(case),
               'cpu': value, 'cpuUnavailable': missing}, 'competitors': {}}
        for player in ('movi', 'libmedia'):
            prior = competitor_records.get((key, player))
            if not prior:
                row['competitors'][player] = {'status': 'not-retested'}
                continue
            current = prior[1]
            diag, reason = cpu(prior, diagnostics.get((key, player)), diagnostic=True) if current['status'] == 'failed' else (None, None)
            row['competitors'][player] = {'status': current['status'], 'failureStage': current.get('failureStage'),
                                           'reason': first_reason(current), 'diagnosticCPU': diag,
                                           'cpuUnavailable': reason}
        rows[label] = row
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=False)
    summary = {'schema': 1, 'scope': 'URL-input headed Chrome catalogue; local-only selective plan measured separately',
               'campaigns': args.campaign, 'competitorDiagnostics': args.competitor,
               'rows': list(rows.values())}
    (out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    table = ['| Media | Auto status / route | Auto CPU (% core) | Movi failed CPU | AVPlayer failed CPU |',
             '| --- | --- | ---: | ---: | ---: |']
    for row in rows.values():
        auto = row['auto']
        val = auto['cpu']
        auto_cpu = f"{val['median']:.1f} ({val['min']:.1f}–{val['max']:.1f}; {val['rounds']} rounds)" if val else '—'
        comps = []
        for player in ('movi', 'libmedia'):
            entry = row['competitors'][player]
            if entry['status'] != 'failed':
                comps.append('—')
            elif entry['diagnosticCPU']:
                comps.append(f"**FAILED** · {entry['diagnosticCPU']['median']:.1f} diagnostic")
            else:
                comps.append('**FAILED** · CPU unavailable')
        table.append('| ' + row['label'] + ' | ' + auto['status'] + ' / ' + auto['route'] + ' | ' + auto_cpu + ' | ' + ' | '.join(comps) + ' |')
    notes = ['# Release Auto CPU retest', '', 'Each Auto number is the median of at least three accepted 20-second headed Chrome windows on the named frozen URL fixture. Values are percentages of one CPU core, not relative savings. The range is the minimum to maximum accepted round. This campaign uses URL input, so the local-file-only selective video + mpv audio plan is not exercised.', '', 'Movi and AVPlayer figures labeled **FAILED** are whole-Chrome diagnostic observations during a failed lifecycle. They are not accepted playback CPU or cross-player efficiency comparisons. Startup failures, stalls, errors and process turnover remain in the raw records; an unavailable CPU means the attempt did not yield a defensible window.', '', *table, '', '## Missing values and failures', '']
    for row in rows.values():
        auto = row['auto']
        if auto['status'] != 'passed' or not auto['cpu']:
            notes.append(f"- {row['label']} — Auto {auto['status']}: {auto['reason'] or auto['cpuUnavailable']}; {auto['cpuUnavailable'] or 'not scored'}.")
        for player in ('movi', 'libmedia'):
            entry = row['competitors'][player]
            if entry['status'] == 'failed':
                notes.append(f"- {row['label']} — {player} failed at {entry['failureStage']}: {entry['reason']}; {entry['cpuUnavailable'] or 'diagnostic CPU recorded'}.")
    notes += ['', '## Evidence', '']
    for pair in args.campaign + args.competitor:
        for path in pair:
            run = Path(path).resolve().parent
            notes.append(f"- {run.relative_to(ROOT)} — summary SHA-256 {hashlib.sha256(Path(path).read_bytes()).hexdigest()}.")
    (out / 'REPORT.md').write_text('\n'.join(notes) + '\n')
    if args.update_readme:
        updated = []
        for line in readme.splitlines():
            if line.startswith('| ') and line.count('|') >= 7:
                cells = line.split('|')
                row = rows.get(cells[1].strip())
                if row:
                    auto = row['auto']
                    val = auto['cpu']
                    cells[4] = ' ' + (f"🟢 (Pass) · {val['median']:.1f}% CPU · {auto['route']}" if auto['status'] == 'passed' and val else
                                       '🟢 (Pass) · CPU unavailable' if auto['status'] == 'passed' else
                                       '🟡 (Screened)* · CPU unavailable' if auto['screenPassed'] else
                                       '🔴 (Fail) · CPU unavailable' if auto['status'] == 'failed' else '⚪ (Blocked) · CPU unavailable') + ' '
                    for player, index in [('movi', 5), ('libmedia', 6)]:
                        entry = row['competitors'][player]
                        if entry['status'] == 'failed':
                            d = entry['diagnosticCPU']
                            cells[index] = ' ' + (f"🔴 (Fail) · {d['median']:.1f}% CPU (diagnostic)" if d else '🔴 (Fail) · CPU attempted, unavailable') + ' '
                    line = '|'.join(cells)
            updated.append(line)
        revised = '\n'.join(updated) + '\n'
        marker = '**Release Auto retest (2026-09-25):**'
        if marker in revised:
            raise ValueError('Release retest note already exists; review before replacing')
        revised = revised.replace('| Media format |', marker + ' The refreshed Auto cells use frozen URL fixtures and three accepted Chrome CPU rounds when available. Failed Movi/AVPlayer CPU figures are diagnostic observations during failed playback and are not efficiency comparisons. [Raw status, route, round ranges and exclusions](' + str(out.relative_to(ROOT)) + '/REPORT.md).\n\n| Media format |', 1)
        (ROOT / 'README.md').write_text(revised)
    print(json.dumps({'rows': len(rows), 'autoMeasured': sum(bool(r['auto']['cpu']) for r in rows.values()),
                      'failedCompetitorCPU': sum(bool(c['diagnosticCPU']) for r in rows.values() for c in r['competitors'].values()),
                      'report': str(out)}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--campaign', nargs=2, action='append', default=[], metavar=('CORRECTNESS', 'PERFORMANCE'))
    parser.add_argument('--competitor', nargs=2, action='append', default=[], metavar=('CORRECTNESS', 'DIAGNOSTIC'))
    parser.add_argument('--output', required=True)
    parser.add_argument('--update-readme', action='store_true')
    render(parser.parse_args())

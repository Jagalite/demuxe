#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Render fresh Auto rows and separately labeled failed-player CPU attempts."""
import argparse
import hashlib
import json
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ALIASES = {'H.264 + PCM24 / MKV + external ASS': 'H.264 + PCM24 / MKV + ASS'}


def read(path):
    return json.loads(Path(path).read_text())


def first_reason(record):
    return (str(record.get('reason') or record.get('failureStage') or '').splitlines() or [''])[0]


def identity(a, b):
    for key in ('assetsSHA256', 'harnessSHA256', 'browserIdentity'):
        if a.get(key) != b.get(key):
            raise ValueError(f'Mismatched {key}: {a.get(key)} / {b.get(key)}')


def load_pair(paths, records, measurements, labels, *, diagnostic=False):
    correctness, performance = map(read, paths)
    assert correctness['kind'] == 'correctness' and performance['kind'] == 'performance'
    if performance.get('browserScope') == 'campaign':
        raise ValueError('Single-browser campaign is an exploratory first pass, not independent release CPU rounds')
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
    screened = bool(run.get('screenedCpu'))
    accepted = [case[field]['oneCorePercent'] for case in cases
                if (diagnostic or (screened and case['status'] == 'blocked' and case.get('screenMeasured'))
                    or case['status'] == 'passed') and case.get(field)
                and isinstance(case[field].get('oneCorePercent'), (int, float))]
    required = 3
    if not diagnostic and (len(accepted) < required or len({case['round'] for case in cases if case.get(field)}) < required
                           or any(not (case['status'] == 'passed' or screened and case['status'] == 'blocked'
                                       and case.get('screenMeasured')) for case in cases)):
        rejected = [f"round {case.get('round')}: {case.get('status')} at {case.get('failureStage', 'window')} — {first_reason(case)}"
                    for case in cases if case['status'] not in ('passed', 'blocked') or
                    case['status'] == 'blocked' and not case.get('screenMeasured')]
        return None, f'{required} complete accepted rounds required' + (': ' + '; '.join(rejected) if rejected else '')
    if not accepted:
        return None, 'CPU attempted; no stable process window'
    return {'median': statistics.median(accepted), 'min': min(accepted), 'max': max(accepted),
            'rounds': len(accepted), 'records': [case['recordPath'] for case in cases],
            'diagnostic': diagnostic, 'screened': screened,
            'issues': sorted({issue for case in cases for issue in case.get('diagnosticMeasurement', {}).get('issues', [])})
            if diagnostic else []}, None


def route(case):
    diagnostics = (case.get('initial') or {}).get('diagnostics') or {}
    return (diagnostics.get('plan') or {}).get('id') or case.get('initial', {}).get('route') or 'unavailable'


def render(args):
    records, measurements, labels = {}, {}, {}
    for pair in args.campaign:
        load_pair(pair, records, measurements, labels)
    for pair in args.screened:
        load_pair(pair, records, measurements, labels)
    specialist_cases = {}
    specialist_assets_hashes = set()
    if len(args.specialist_screen) != len(args.specialist_cpu):
        raise ValueError('Each specialist screen needs its own CPU round group')
    for screen_path, cpu_paths in zip(args.specialist_screen, args.specialist_cpu):
        specialist = read(screen_path)
        assert specialist['kind'] == 'specialist-basic-screen'
        specialist_assets = Path(specialist['command'][2]).resolve()
        specialist_manifest = (specialist_assets / 'manifest.json').read_bytes()
        if hashlib.sha256(specialist_manifest).hexdigest() != specialist['assetsSHA256']:
            raise ValueError('Specialist screen asset manifest mismatch')
        specialist_fixtures = read(specialist_assets / 'specialist.json')
        if len({str(Path(path).resolve()) for path in cpu_paths}) != len(cpu_paths):
            raise ValueError('Repeated specialist CPU round path')
        specialist_cpu_runs = [read(path) for path in cpu_paths]
        for run in specialist_cpu_runs:
            if (run.get('browser') != specialist.get('browser') or run.get('benchmarkPolicy') != specialist.get('benchmarkPolicy')
                    or run.get('harnessSHA256') != specialist.get('harnessSHA256')):
                raise ValueError('Specialist CPU browser/protocol differs from screen')
        if specialist.get('benchmarkPolicy') and len({run.get('cpuRound') for run in specialist_cpu_runs}) != len(specialist_cpu_runs):
            raise ValueError('Repeated specialist CPU round number')
        if any(run['assetsSHA256'] != specialist['assetsSHA256'] for run in specialist_cpu_runs):
            raise ValueError('Specialist CPU snapshot differs from screen')
        specialist_assets_hashes.add(specialist['assetsSHA256'])
        for case in specialist['cases']:
            if case['player'] == 'demuxe':
                if case['fixture'] in specialist_cases:
                    raise ValueError('Duplicate specialist Auto fixture: ' + case['fixture'])
                specialist_cases[case['fixture']] = (case, specialist_fixtures[case['fixture']], specialist_cpu_runs, cpu_paths)
    competitor_records, diagnostics, ignored = {}, {}, {}
    for pair in args.competitor:
        load_pair(pair, competitor_records, diagnostics, ignored, diagnostic=True)
    specialist_competitor_cases = {}
    for path in args.specialist_competitor_screen:
        specialist_competitors = read(path)
        if specialist_competitors['assetsSHA256'] not in specialist_assets_hashes:
            raise ValueError('Specialist competitor screen uses another asset snapshot')
        competitor_assets = Path(specialist_competitors['command'][2]).resolve()
        competitor_fixtures = read(competitor_assets / 'specialist.json')
        for case in specialist_competitors['cases']:
            if case['player'] in ('movi', 'libmedia'):
                specialist_competitor_cases[(case['fixture'], case['player'])] = (case, competitor_fixtures[case['fixture']])
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
               'cpu': value, 'cpuUnavailable': missing,
               'trackTransitions': [{'codec': item['requestedCodec'], 'route': item['route']}
                                    for item in case.get('audioTrackTransitions', [])]}, 'competitors': {}}
        if key in specialist_cases:
            specialist_case, specialist_fixture, specialist_cpu_runs, specialist_cpu_paths = specialist_cases[key]
            source_file = Path(proof[0]['assets']) / 'fixtures' / specialist_fixture['file']
            substituted = not source_file.is_file() and case['status'] == 'blocked'
            if not substituted and hashlib.sha256(source_file.read_bytes()).hexdigest() != specialist_fixture['sha256']:
                raise ValueError('Specialist source differs from catalogue: ' + key)
            row['auto'].update(status='blocked' if specialist_case['status'] == 'passed' else 'failed',
                               screenPassed=specialist_case['status'] == 'passed',
                               route=route(specialist_case),
                               reason=('Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.'
                                       if specialist_case['status'] == 'passed' else first_reason(specialist_case)),
                               specialistScreen=specialist_case['recordPath'],
                               specialistSourceSHA256=specialist_fixture['sha256'], sourceSubstituted=substituted)
            row['auto']['cpu'] = None
            row['auto']['cpuUnavailable'] = 'Complete matching specialist CPU rounds required'
            if specialist_cpu_runs and specialist_case['status'] == 'passed':
                samples = []
                for run in specialist_cpu_runs:
                    candidates = [entry for entry in run['cases'] if entry['fixture'] == key and entry['player'] == 'demuxe']
                    if len(candidates) != 1 or candidates[0]['status'] != 'passed' or not candidates[0].get('cpu', {}).get('accepted'):
                        break
                    samples.append(candidates[0]['cpu']['oneCorePercent'])
                if len(samples) == len(specialist_cpu_runs) and len(samples) >= 3:
                    row['auto']['cpu'] = {'median': statistics.median(samples), 'min': min(samples), 'max': max(samples),
                                          'rounds': len(samples), 'records': [str(path) for path in specialist_cpu_paths],
                                          'diagnostic': False, 'screened': True}
                    row['auto']['cpuUnavailable'] = None
        for player in ('movi', 'libmedia'):
            if (key, player) in specialist_competitor_cases:
                current, specialist_fixture = specialist_competitor_cases[(key, player)]
                source_file = Path(proof[0]['assets']) / 'fixtures' / specialist_fixture['file']
                if source_file.is_file() and hashlib.sha256(source_file.read_bytes()).hexdigest() != specialist_fixture['sha256']:
                    raise ValueError('Specialist competitor source differs from catalogue: ' + key)
                if not source_file.is_file() and case['status'] != 'blocked':
                    raise ValueError('Specialist competitor source absent from a playable marked row: ' + key)
                raw_cpu = current.get('cpu', {}).get('oneCorePercent')
                diagnostic_cpu = ({'median': raw_cpu, 'min': raw_cpu, 'max': raw_cpu, 'rounds': 1,
                                   'diagnostic': True, 'screened': True}
                                  if current['status'] == 'failed' and isinstance(raw_cpu, (int, float)) else None)
                row['competitors'][player] = {'status': current['status'], 'failureStage': current.get('failureStage'),
                                               'reason': first_reason(current), 'diagnosticCPU': diagnostic_cpu,
                                               'basicScreenCPU': raw_cpu if current['status'] == 'passed' else None,
                                               'cpuUnavailable': None if diagnostic_cpu else current.get('cpuUnavailable')}
                continue
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
    if args.competitor_targets:
        targets = read(args.competitor_targets)
        for group in targets['campaigns'].values():
            for target in group:
                entry = rows[target['label']]['competitors'][target['id'].split('.')[0]]
                if entry['status'] == 'not-retested':
                    raise ValueError('Previously error-marked competitor case was not retested: ' + target['id'])
    out = Path(args.output).resolve()
    if args.replace_existing:
        if not out.is_dir() or {child.name for child in out.iterdir()} - {'summary.json', 'REPORT.md'}:
            raise ValueError('Can replace only an unarchived generated release report')
        if read(out / 'summary.json').get('scope') != 'URL-input headed Chrome catalogue; local-only selective plan measured separately':
            raise ValueError('Existing report is not a release Auto report')
    out.mkdir(parents=True, exist_ok=args.replace_existing)
    summary = {'schema': 1, 'scope': 'URL-input headed Chrome catalogue; local-only selective plan measured separately',
               'command': sys.argv,
               'campaigns': args.campaign, 'screenedCampaigns': args.screened, 'competitorDiagnostics': args.competitor,
               'specialistScreen': args.specialist_screen, 'specialistCpu': args.specialist_cpu,
               'specialistCompetitorScreen': args.specialist_competitor_screen,
               'competitorTargets': args.competitor_targets,
               'rows': list(rows.values())}
    summary['counts'] = {
        'rows': len(rows),
        'fullPassWithCPU': sum(r['auto']['status'] == 'passed' and bool(r['auto']['cpu']) for r in rows.values()),
        'boundedScreenWithCPU': sum(r['auto']['screenPassed'] and bool(r['auto']['cpu']) for r in rows.values()),
        'passWithoutCPU': sum(r['auto']['status'] == 'passed' and not r['auto']['cpu'] for r in rows.values()),
        'blockedWithoutScreen': sum(r['auto']['status'] == 'blocked' and not r['auto']['screenPassed'] for r in rows.values()),
        'failed': sum(r['auto']['status'] == 'failed' for r in rows.values()),
        'failedCompetitorDiagnosticCPU': sum(bool(c.get('diagnosticCPU')) for r in rows.values() for c in r['competitors'].values()),
    }
    (out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    table = ['| Media | Auto status / route | Auto CPU (% core) | Movi failed CPU | AVPlayer failed CPU |',
             '| --- | --- | ---: | ---: | ---: |']
    for row in rows.values():
        auto = row['auto']
        val = auto['cpu']
        auto_cpu = f"{val['median']:.1f} ({val['min']:.1f}–{val['max']:.1f}; {val['rounds']} rounds){'*' if val['screened'] else ''}" if val else '—'
        comps = []
        for player in ('movi', 'libmedia'):
            entry = row['competitors'][player]
            if entry['status'] != 'failed':
                comps.append('—')
            elif entry['diagnosticCPU']:
                comps.append(f"**FAILED** · {entry['diagnosticCPU']['median']:.1f} diagnostic")
            else:
                comps.append('**FAILED** · CPU unavailable')
        table.append('| ' + row['label'] + ' | ' + ('screened' if auto['screenPassed'] else auto['status']) + ' / ' + auto['route'] + ' | ' + auto_cpu + ' | ' + ' | '.join(comps) + ' |')
    counts = summary['counts']
    notes = ['# Release Auto CPU retest', '',
             f"All {counts['rows']} README Auto rows have fresh correctness or source-block evidence: {counts['fullPassWithCPU']} full passes with CPU, {counts['boundedScreenWithCPU']} bounded screens with CPU, {counts['passWithoutCPU']} lifecycle passes whose CPU windows were rejected, and {counts['blockedWithoutScreen']} fixture/source blocks. Auto failures: {counts['failed']}.",
             '', 'Each full Auto number is the median of at least three accepted 20-second headed Chrome windows on the named frozen URL fixture. Values are percentages of one CPU core, not relative savings. The range is the minimum to maximum accepted round. Screened rows retain their limited scope: they do not establish HDR, surround, spatial or physical output fidelity. This campaign uses URL input, so the local-file-only selective video + mpv audio plan is not exercised.',
             '', 'Movi and AVPlayer figures labeled **FAILED** are whole-Chrome diagnostic observations during a failed lifecycle. They are not accepted playback CPU or cross-player efficiency comparisons. Startup failures, stalls, errors and process turnover remain in the raw records; an unavailable CPU means the attempt did not yield a defensible window.',
             '', 'The first snapshot attempt (`release-auto-20260925-01`) is excluded because it omitted committed WebGPU runtime imports. The corrected frozen snapshot and focused H.264 MPEG-TS/dual-audio harness reruns supersede that negative attempt. The MPEG-TS correction permits a diagnosed AVC initialization incompatibility to fall back to Hybrid; the dual-audio correction waits for the selected-track state before judging its audio.',
             '', *table, '', '## Wide CPU ranges', '']
    wide = [(row['label'], row['auto']['cpu']) for row in rows.values()
            if row['auto']['cpu'] and row['auto']['cpu']['max'] - row['auto']['cpu']['min'] >= 10]
    notes.extend(f"- {label}: {value['min']:.1f}–{value['max']:.1f} core points across three rounds; median is reported but should not be treated as a stable fine-grained difference."
                 for label, value in wide)
    if not wide:
        notes.append('No Auto row exceeded a 10-core-point round range.')
    notes += ['', '## Missing values and failures', '']
    for row in rows.values():
        auto = row['auto']
        if auto['status'] != 'passed' or not auto['cpu']:
            notes.append(f"- {row['label']} — Auto {auto['status']}: {auto['reason'] or auto['cpuUnavailable']}; {auto['cpuUnavailable'] or 'not scored'}.")
        if auto.get('sourceSubstituted'):
            notes.append(f"- {row['label']} — bounded real specialist bitstream substituted for an unmakeable marked placeholder; source SHA-256 {auto['specialistSourceSHA256']}. This is a different fixture and is not a matched CPU comparison with the placeholder.")
        for player in ('movi', 'libmedia'):
            entry = row['competitors'][player]
            if entry['status'] == 'failed':
                issues = ', '.join(entry.get('diagnosticCPU', {}).get('issues', [])) if entry.get('diagnosticCPU') else ''
                notes.append(f"- {row['label']} — {player} failed at {entry['failureStage']}: {entry['reason']}; {entry['cpuUnavailable'] or 'diagnostic CPU recorded'}{'; window issues: ' + issues if issues else ''}.")
            elif entry['status'] in ('passed', 'blocked'):
                scope = 'bounded basic screen' if isinstance(entry.get('basicScreenCPU'), (int, float)) else 'default retest'
                detail = f" {entry['reason']}" if entry['reason'] else ''
                notes.append(f"- {row['label']} — {player} fresh {scope} {entry['status']}; prior README error cell superseded.{detail}")
    notes += ['', '## Evidence', '']
    for pair in args.campaign + args.screened + args.competitor:
        for path in pair:
            run = Path(path).resolve().parent
            notes.append(f"- {run.relative_to(ROOT)} — summary SHA-256 {hashlib.sha256(Path(path).read_bytes()).hexdigest()}.")
    for path in args.specialist_screen:
        notes.append(f"- {Path(path).resolve().parent.relative_to(ROOT)} — basic real-bitstream screen, summary SHA-256 {hashlib.sha256(Path(path).read_bytes()).hexdigest()}.")
    for group in args.specialist_cpu:
        for path in group:
            notes.append(f"- {Path(path).resolve().parent.relative_to(ROOT)} — basic-screen CPU run, summary SHA-256 {hashlib.sha256(Path(path).read_bytes()).hexdigest()}.")
    for path in args.specialist_competitor_screen:
        notes.append(f"- {Path(path).resolve().parent.relative_to(ROOT)} — specialist competitor diagnostic screen, summary SHA-256 {hashlib.sha256(Path(path).read_bytes()).hexdigest()}.")
    if args.competitor_targets:
        notes.append(f"- {Path(args.competitor_targets).resolve().relative_to(ROOT)} — pre-refresh competitor error target list, SHA-256 {hashlib.sha256(Path(args.competitor_targets).read_bytes()).hexdigest()}.")
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
                    was_starred = '(Pass)*' in cells[4] or r'(Pass)\*' in cells[4]
                    cells[4] = ' ' + (f"🟢 (Pass){r'\*' if was_starred else ''} · {val['median']:.1f}% CPU · {auto['route']}" if auto['status'] == 'passed' and val else
                                       '🟢 (Pass) · CPU unavailable' if auto['status'] == 'passed' else
                                       f"🟡 (Screened)\\* · {val['median']:.1f}% CPU · {auto['route']}" if auto['screenPassed'] and val else
                                       '🟡 (Screened)\\* · CPU unavailable' if auto['screenPassed'] else
                                       '🔴 (Fail) · CPU unavailable' if auto['status'] == 'failed' else '⚪ (Blocked) · CPU unavailable') + ' '
                    if 'visible combing' in line:
                        cells[4] = cells[4].rstrip() + ' · visible combing '
                    switched = auto.get('trackTransitions') or []
                    if switched:
                        first = switched[0]
                        codec = {'ac3': 'AC-3', 'eac3': 'E-AC-3'}.get(first['codec'].lower(), first['codec'].upper())
                        cells[4] = cells[4].rstrip() + f" · {codec} switch: {first['route']} "
                    for player, index in [('movi', 5), ('libmedia', 6)]:
                        entry = row['competitors'][player]
                        if entry['status'] == 'failed':
                            d = entry['diagnosticCPU']
                            cells[index] = ' ' + (f"🔴 (Fail) · {d['median']:.1f}% CPU (diagnostic)" if d else '🔴 (Fail) · CPU attempted, unavailable') + ' '
                        elif entry['status'] == 'passed':
                            cells[index] = (' 🟡 (Screened)\\* · %.1f%% CPU ' % entry['basicScreenCPU']
                                            if isinstance(entry.get('basicScreenCPU'), (int, float)) else ' 🟢 (Pass) · CPU not measured ')
                        elif entry['status'] == 'blocked':
                            cells[index] = ' ⚪ (Blocked) · CPU unavailable '
                    line = '|'.join(cells)
            updated.append(line)
        revised = '\n'.join(updated) + '\n'
        marker = '**Release Auto retest (2026-09-25):**'
        note = marker + ' The refreshed Auto cells use frozen URL fixtures and three accepted Chrome CPU rounds when available. Other CPU columns retain earlier campaigns and must not be compared directly. Screened specialist cells use bounded real bitstreams and do not establish HDR, spatial or physical output fidelity. Failed Movi/AVPlayer CPU figures are diagnostic observations during failed playback and are not efficiency comparisons. [Raw status, route, round ranges and exclusions](' + str(out.relative_to(ROOT)) + '/REPORT.md).'
        if marker in revised:
            if not args.replace_existing:
                raise ValueError('Release retest note already exists; review before replacing')
            revised = '\n'.join(note if line.startswith(marker) else line for line in revised.splitlines()) + '\n'
        else:
            revised = revised.replace('| Media format |', note + '\n\n| Media format |', 1)
        (ROOT / 'README.md').write_text(revised)
    print(json.dumps({'rows': len(rows), 'autoMeasured': sum(bool(r['auto']['cpu']) for r in rows.values()),
                      'failedCompetitorCPU': sum(bool(c.get('diagnosticCPU')) for r in rows.values() for c in r['competitors'].values()),
                      'report': str(out)}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--campaign', nargs=2, action='append', default=[], metavar=('CORRECTNESS', 'PERFORMANCE'))
    parser.add_argument('--screened', nargs=2, action='append', default=[], metavar=('SCREEN', 'CPU'))
    parser.add_argument('--specialist-screen', action='append', default=[])
    parser.add_argument('--specialist-cpu', nargs='+', action='append', default=[], metavar='ROUND')
    parser.add_argument('--specialist-competitor-screen', action='append', default=[])
    parser.add_argument('--competitor', nargs=2, action='append', default=[], metavar=('CORRECTNESS', 'DIAGNOSTIC'))
    parser.add_argument('--competitor-targets')
    parser.add_argument('--output', required=True)
    parser.add_argument('--update-readme', action='store_true')
    parser.add_argument('--replace-existing', action='store_true', help='Regenerate only an unarchived report and its README cells')
    render(parser.parse_args())

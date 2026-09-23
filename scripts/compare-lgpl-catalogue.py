#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Classify the complete README Demuxe catalogue against matched engine builds."""
import argparse
import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENGINE_NAMES = [f'web/{folder}/{stem}.{ext}'
                for folder, stem in [('engine-hybrid', 'player'),
                                     ('engine-software-full', 'player'),
                                     ('engine-remux', 'remux'),
                                     ('engine-subtitles', 'service')]
                for ext in ('mjs', 'wasm')]
OPTIONAL_NAMES = [f'web/{folder}/{stem}.{ext}'
                  for folder, stem in [('engine-ass', 'subtitles'),
                                       ('engine-adaptation', 'remux')]
                  for ext in ('mjs', 'wasm')]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def readme_rows():
    lines = (ROOT / 'README.md').read_text().splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith('| Media format | Native video | Demuxe (auto) |'))
    rows = []
    for line in lines[start + 2:]:
        if not line.startswith('| '):
            break
        rows.append(line.split('|')[1].strip())
    if len(rows) != 71 or len(rows) != len(set(rows)):
        raise ValueError('Current README catalogue is no longer the reviewed 71-row table')
    return rows


def snapshot(summary_path):
    summary = json.loads(summary_path.read_text())
    if summary.get('kind') != 'correctness' or summary.get('browser') not in (None, 'chromium'):
        raise ValueError('Expected a Chromium correctness summary: ' + str(summary_path))
    assets = pathlib.Path(summary['assets'])
    manifest_path = assets / 'manifest.json'
    if digest(manifest_path) != summary['assetsSHA256']:
        raise ValueError('Changed catalogue asset manifest: ' + str(summary_path))
    manifest = json.loads(manifest_path.read_text())
    if not manifest.get('optionalArchiveSHA256'):
        raise ValueError('Catalogue lane lacks exact packaged optional engine archive')
    for name, record in manifest['files'].items():
        if name.startswith('fixtures/') or name.startswith('demuxe/web/engine-'):
            file = assets / name
            if not file.is_file() or digest(file) != record['sha256']:
                raise ValueError('Changed catalogue fixture or engine bytes: ' + name)
    fixtures = json.loads((assets / 'fixtures/catalogue.json').read_text())
    cases = summary.get('cases', [])
    selected = {f'demuxe.auto.{name}' for name in fixtures}
    if set(summary.get('selected', [])) != selected or {case['id'] for case in cases} != selected or len(cases) != len(selected):
        raise ValueError('Incomplete or duplicated Demuxe auto catalogue: ' + str(summary_path))
    return summary, manifest, fixtures, {case['fixture']: case for case in cases}


def passed(case):
    return case['status'] == 'passed' or (case['status'] == 'blocked' and case.get('screenPassed') is True)


def classify(before, after):
    old_pass, new_pass = passed(before), passed(after)
    old_route = before.get('initial', {}).get('route')
    new_route = after.get('initial', {}).get('route')
    if old_pass and new_pass:
        return 'pass with route change' if old_route != new_route else 'identical pass'
    if not old_pass and new_pass:
        return 'pass with measurable behavior difference'
    if old_pass and after['status'] == 'failed':
        return 'regression'
    return 'blocked'


def compare(before_path, after_path):
    before_summary, before_manifest, before_fixtures, before = snapshot(before_path)
    after_summary, after_manifest, after_fixtures, after = snapshot(after_path)
    if before_summary['harnessSHA256'] != after_summary['harnessSHA256']:
        raise ValueError('Baseline and candidate use different acceptance checks')
    if before_summary.get('browserIdentity') != after_summary.get('browserIdentity'):
        raise ValueError('Baseline and candidate use different browser builds')
    if before_fixtures != after_fixtures:
        raise ValueError('Baseline and candidate use different fixture catalogue definitions')
    fixture_files = {name: record['sha256'] for name, record in before_manifest['files'].items()
                     if name.startswith('fixtures/')}
    if fixture_files != {name: record['sha256'] for name, record in after_manifest['files'].items()
                         if name.startswith('fixtures/')}:
        raise ValueError('Baseline and candidate use different fixture bytes')
    rows = readme_rows()
    fixture_labels = {name: (rows[rows.index('H.264 + PCM24 / MKV + ASS')]
                             if name == 'pcm-ass' else fixture['label'])
                      for name, fixture in before_fixtures.items()}
    if set(fixture_labels.values()) != set(rows) or len(fixture_labels) != len(rows):
        raise ValueError('Fixture labels no longer cover every README row')
    build_path = ROOT / 'build/beta-build.json'
    build = json.loads(build_path.read_text())
    if build.get('licensingEvidence', {}).get('status') != 'verified':
        raise ValueError('Candidate has no verified LGPL engine build record')
    for name in ENGINE_NAMES:
        packaged = after_manifest['files'].get('demuxe/' + name)
        recorded = build['artifacts'].get(name)
        if not packaged or not recorded or packaged['sha256'] != recorded['sha256']:
            raise ValueError('Candidate catalogue did not use the recorded LGPL engine: ' + name)
    for name in OPTIONAL_NAMES:
        if 'demuxe/' + name not in before_manifest['files'] or 'demuxe/' + name not in after_manifest['files']:
            raise ValueError('Published optional engine missing from catalogue lane: ' + name)
    for folder in ('engine-ass', 'engine-adaptation'):
        path = pathlib.Path(after_summary['assets']) / 'demuxe/web' / folder / 'manifest.json'
        manifest = json.loads(path.read_text())
        if not manifest.get('sourceBuildVerification', {}).get('verified'):
            raise ValueError('Candidate optional engine lacks clean source verification: ' + folder)
        if folder == 'engine-adaptation' and manifest.get('profiles') != ['flac', 'opus']:
            raise ValueError('Candidate lost the published FLAC/Opus preparation profiles')
    baseline_engines = {name: before_manifest['files'].get('demuxe/' + name, {}).get('sha256')
                        for name in ENGINE_NAMES}
    if all(baseline_engines[name] == build['artifacts'][name]['sha256'] for name in ENGINE_NAMES):
        raise ValueError('GPL baseline asset snapshot reused all candidate engines')
    cases = []
    for name in before_fixtures:
        old, new = before[name], after[name]
        category = classify(old, new)
        cases.append({'fixture': name, 'readmeRow': fixture_labels[name],
                      'classification': category,
                      'baseline': {'status': old['status'], 'route': old.get('initial', {}).get('route'),
                                   'firstFailureStage': old.get('failureStage'),
                                   'qualificationLimit': old.get('qualificationLimit')},
                      'candidate': {'status': new['status'], 'route': new.get('initial', {}).get('route'),
                                    'firstFailureStage': new.get('failureStage'),
                                    'qualificationLimit': new.get('qualificationLimit')},
                      'candidateNewlyBlocked': passed(old) and not passed(new),
                      'candidateRegression': category == 'regression'})
    counts = {category: sum(case['classification'] == category for case in cases)
              for category in ['identical pass', 'pass with route change',
                               'pass with measurable behavior difference', 'regression', 'blocked']}
    counts['stillPass'] = counts['identical pass'] + counts['pass with route change'] + counts['pass with measurable behavior difference']
    counts['newlyBlocked'] = sum(case['candidateNewlyBlocked'] for case in cases)
    return {'schema': 1, 'status': 'qualified' if not counts['regression'] and not counts['newlyBlocked']
            and counts['stillPass'] == len(rows) else 'review-required',
            'readmeSHA256': digest(ROOT / 'README.md'), 'rows': len(rows), 'counts': counts,
            'baselineSummary': {'path': str(before_path.resolve()), 'sha256': digest(before_path),
                                'assetsSHA256': before_summary['assetsSHA256']},
            'candidateSummary': {'path': str(after_path.resolve()), 'sha256': digest(after_path),
                                 'assetsSHA256': after_summary['assetsSHA256']},
            'baselineOptionalArchiveSHA256': before_manifest['optionalArchiveSHA256'],
            'candidateOptionalArchiveSHA256': after_manifest['optionalArchiveSHA256'],
            'harnessSHA256': before_summary['harnessSHA256'],
            'fixtureSHA256': fixture_files,
            'candidateEngineBuildSHA256': digest(build_path),
            'candidateEngineHashes': {name: build['artifacts'][name]['sha256'] for name in ENGINE_NAMES},
            'baselineEngineHashes': baseline_engines,
            'candidateOptionalEngineHashes': {name: after_manifest['files']['demuxe/' + name]['sha256']
                                              for name in OPTIONAL_NAMES},
            'baselineOptionalEngineHashes': {name: before_manifest['files']['demuxe/' + name]['sha256']
                                             for name in OPTIONAL_NAMES},
            'cases': cases}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=pathlib.Path, required=True)
    parser.add_argument('--candidate', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    record = compare(args.baseline, args.candidate)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(record, indent=2) + '\n')
    print(args.output, record['status'], record['counts'])

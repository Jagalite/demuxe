#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Keep reviewable compressed run summaries beside a release Auto report."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main(args):
    report = Path(args.report).resolve()
    summary = json.loads((report / 'summary.json').read_text())
    paths = []
    for pair in summary['campaigns'] + summary['screenedCampaigns'] + summary['competitorDiagnostics']:
        paths.extend(pair)
    paths.extend(summary['specialistScreen'])
    for group in summary['specialistCpu']:
        paths.extend(group)
    paths.extend(summary['specialistCompetitorScreen'])
    paths.extend(args.excluded)
    if summary.get('competitorTargets'):
        paths.append(summary['competitorTargets'])
    output = report / 'evidence'
    output.mkdir(exist_ok=False)
    index = []
    for item in dict.fromkeys(paths):
        source = Path(item).resolve()
        if not source.is_relative_to(ROOT / 'results' / 'head-to-head') or not source.is_file():
            raise ValueError('Evidence is outside results/head-to-head: ' + str(source))
        name = source.parent.name + '-' + source.name + '.zst'
        target = output / name
        if target.exists():
            raise ValueError('Duplicate evidence basename: ' + name)
        original = source.read_bytes()
        with target.open('wb') as stream:
            subprocess.run(['zstd', '-q', '-9', '-T1', '-c', str(source)], check=True, stdout=stream)
        decoded = subprocess.check_output(['zstd', '-q', '-dc', str(target)])
        if decoded != original:
            raise ValueError('Compressed evidence did not round-trip: ' + str(source))
        compressed = target.read_bytes()
        index.append({'source': str(source.relative_to(ROOT)), 'sourceSHA256': sha(original),
                      'sourceBytes': len(original), 'archive': name,
                      'archiveSHA256': sha(compressed), 'archiveBytes': len(compressed),
                      'excludedFromReport': item in args.excluded})
    (output / 'index.json').write_text(json.dumps({'schema': 1, 'files': index}, indent=2) + '\n')
    with (report / 'REPORT.md').open('a') as stream:
        stream.write('\n## Compressed evidence\n\n')
        stream.write('The [evidence index](evidence/index.json) records SHA-256 hashes of each original JSON file and its losslessly compressed copy. ')
        stream.write('Full local run directories retain screenshots, request logs and per-case files. Superseded runs remain identified in the index.\n')
    print(json.dumps({'files': len(index), 'compressedBytes': sum(entry['archiveBytes'] for entry in index)}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', required=True)
    parser.add_argument('--excluded', action='append', default=[], help='Retained negative or superseded run summary')
    main(parser.parse_args())

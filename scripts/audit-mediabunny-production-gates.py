#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Inventory codec-sealing inputs for a candidate core without changing qualification."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--core', type=Path, required=True, help='Candidate core assembly.json')
parser.add_argument('--output', type=Path, required=True, help='New report path')
parser.add_argument('--evidence-root', type=Path, default=ROOT, help='Read-only checkout containing gate receipts')
args = parser.parse_args()
sha = lambda value: hashlib.sha256(value).hexdigest()
core = json.loads(args.core.read_bytes())
archive = Path(core['archive'])
if sha(archive.read_bytes()) != core['archiveSHA256']:
    raise ValueError('Candidate core archive hash changed')
requirements = []
for runtime, browser in [('asyncify', 'chrome'), ('asyncify', 'firefox'), ('jspi', 'chrome')]:
    for name in ['full', 'player', 'real-player', 'soak']:
        requirements.append((f'results/media-components/production-preparation/{name}-{runtime}-{browser}.json', name != 'full'))
for browser in ['chrome', 'firefox']:
    for name in ['installed', 'player']:
        requirements.append((f'results/media-components/production-audio/{name}-{browser}.json', True))
    requirements.extend([(f'results/media-components/production-preparation/faults-asyncify-{browser}.json', False),
                         (f'results/media-components/production-preparation/runtime-regressions/{browser}.json', True)])
requirements.extend((f'results/media-components/production-audio/{name}.json', False) for name in ['host-recipes', 'stream'])
for runtime in ['asyncify', 'jspi']:
    for category in ['production-audio', 'production-preparation']:
        requirements.append((f'results/media-components/{category}/performance-{runtime}.json', False))
requirements.extend((f'results/media-components/production-preparation/{name}.json', False) for name in ['file-sizes', 'source-gates', 'release-guards'])
rows = []
for name, exact in requirements:
    path = args.evidence_root / name
    row = {'path': name, 'exactCoreRequired': exact}
    if not path.is_file():
        row['state'] = 'missing'
    else:
        raw = path.read_bytes(); row['sha256'] = sha(raw)
        try:
            value = json.loads(raw)
            if value.get('passed') is not True or value.get('error') or value.get('cleanupError'):
                row['state'] = 'not-clean-pass'
            elif exact:
                archives = value.get('setup', value).get('archives', [])
                row['observedCoreSHA256'] = archives[0].get('archiveSHA256') if archives else None
                row['state'] = 'matching-core' if row['observedCoreSHA256'] == core['archiveSHA256'] else 'different-or-missing-core'
            else:
                row['state'] = 'present-clean-pass-unchecked-matrix'
        except (TypeError, ValueError, KeyError, IndexError):
            row['state'] = 'malformed'
    rows.append(row)
report = {'status': 'codec-sealing-input-inventory-not-qualification', 'coreArchiveSHA256': core['archiveSHA256'],
          'evidenceRoot': str(args.evidence_root.resolve()),
          'sealerSHA256': sha((ROOT / 'scripts/qualify-codec-providers.py').read_bytes()),
          'auditorSHA256': sha(Path(__file__).read_bytes()), 'requirements': rows,
          'limits': ['Read-only presence, clean-pass and selected exact-core checks only; case sets, sources, provider archives and review are not validated.',
                     'This is the maintained initial codec sealing workflow, not a complete MediaBunny release plan.',
                     'No qualification record or existing gate receipt is changed.']}
with args.output.open('x') as out:
    json.dump(report, out, indent=2); out.write('\n')
print(json.dumps({'status': report['status'], 'requirements': len(rows), 'missing': sum(row['state'] == 'missing' for row in rows)}))

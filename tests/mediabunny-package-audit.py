#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exercise private MediaBunny candidates through the shared package auditor."""
import argparse
import copy
from contextlib import nullcontext
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import mediabunny_package_audit as audit


def run(args, ok=True):
    result = subprocess.run(args, cwd=ROOT, text=True, capture_output=True, timeout=120)
    if ok and result.returncode:
        raise AssertionError(result.stderr)
    if not ok and not result.returncode:
        raise AssertionError('Unexpected audit success: ' + repr(args))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('webm', type=Path)
    parser.add_argument('mp4', type=Path)
    parser.add_argument('stream', type=Path)
    parser.add_argument('--output', type=Path, help='Retain artifacts in a new directory')
    args = parser.parse_args()
    results = []
    if args.output:
        args.output.mkdir()
        context = nullcontext(str(args.output))
    else:
        context = tempfile.TemporaryDirectory(prefix='demuxe-main-audit-test-')
    with context as temp:
        root = Path(temp).resolve()
        for kind in ('webm', 'mp4', 'stream'):
            payload = root / (kind + '-payload')
            run(['node', str(ROOT / 'packages/provider-mediabunny/assemble-candidate.mjs'), str(getattr(args, kind)), str(payload)])
            record_path = root / (kind + '-record.json')
            record_result = json.loads(run([sys.executable, 'scripts/record-mediabunny-candidate.py', '--payload', str(payload), '--output', str(record_path)]).stdout)
            digest = record_result['sha256']; archive = root / (kind + '.tgz')
            pack = [sys.executable, 'scripts/package-provider.py', '--target', audit.TARGET, '--payload', str(payload), '--record', str(record_path), '--record-sha256', digest, '--output', str(archive)]
            packed = json.loads(run(pack).stdout)
            run([sys.executable, 'scripts/audit-provider-package.py', '--target', audit.TARGET, '--archive', str(archive), '--record', str(record_path), '--record-sha256', digest])
            run(pack, ok=False)  # Exclusive output must preserve the original archive.
            assert hashlib.sha256(archive.read_bytes()).hexdigest() == packed['sha256']
            files = {p.relative_to(payload).as_posix(): p.read_bytes() for p in payload.rglob('*') if p.is_file()}
            record = json.loads(record_path.read_bytes())
            assert audit.audit(files, record)['status'].endswith('not-release')
            # A reviewed digest is not a substitute for source/file validation.
            missing = copy.deepcopy(record); missing['sources'].pop(next(iter(missing['sources'])))
            try: audit.audit(files, missing)
            except ValueError: pass
            else: raise AssertionError('Missing source inventory accepted')
            altered = dict(files); metadata = json.loads(altered['package.json']); metadata['private'] = False
            altered['package.json'] = json.dumps(metadata).encode()
            altered_record = copy.deepcopy(record); altered_record['files']['package.json'] = hashlib.sha256(altered['package.json']).hexdigest()
            try: audit.audit(altered, altered_record)
            except ValueError: pass
            else: raise AssertionError('Publishable metadata accepted')
            adapter = next(name for name in record['sources'] if name.startswith('packages/provider-mediabunny/') and name.endswith('.js'))
            read_local = audit.local_bytes
            with patch.object(audit, 'local_bytes', side_effect=lambda name: read_local(name) + (b'changed' if name == adapter else b'')):
                try: audit.audit(files, record)
                except ValueError: pass
                else: raise AssertionError('Changed local adapter source accepted')
            run([sys.executable, 'scripts/audit-provider-package.py', '--target', audit.TARGET, '--archive', str(archive), '--record', str(record_path), '--record-sha256', '0' * 64], ok=False)
            results.append({'kind': kind, 'archiveSHA256': packed['sha256'], 'recordSHA256': digest,
                            'files': packed['files'], 'sources': record_result['sources']})
    print(json.dumps({'status': 'main-auditor-private-candidates-passed-not-release', 'results': results,
                      'negativeControls': ['missing source inventory', 'publishable metadata', 'changed local adapter', 'wrong reviewed hash', 'existing output preserved']}))


if __name__ == '__main__':
    main()

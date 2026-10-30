#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Inventory core inputs against HEAD and the recorded provider qualification.

This is a source-drift review aid only. It never modifies qualification or grants
release approval; hashes do not demonstrate behavior or independent review.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
sha = lambda data: hashlib.sha256(data).hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def head_blobs(paths, revision):
    process = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    payload = ''.join(f'{revision}:{path}\n' for path in paths).encode()
    output, _ = process.communicate(payload)
    if process.returncode:
        raise RuntimeError('git cat-file failed')
    cursor = 0
    result = {}
    for path in paths:
        end = output.index(b'\n', cursor)
        header = output[cursor:end]
        cursor = end + 1
        if header.endswith(b' missing'):
            result[path] = None
            continue
        parts = header.split()
        if len(parts) != 3 or parts[1] != b'blob':
            raise ValueError(f'Unexpected HEAD object for {path}')
        size = int(parts[2])
        blob = output[cursor:cursor + size]
        if len(blob) != size or output[cursor + size:cursor + size + 1] != b'\n':
            raise ValueError(f'Truncated HEAD object for {path}')
        cursor += size + 1
        result[path] = sha(blob)
    if cursor != len(output):
        raise ValueError('Unexpected git batch output')
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    config_path = ROOT / 'licensing/provider-packages.json'
    qualification_path = ROOT / 'licensing/provider-runtime-qualification.json'
    config_bytes = config_path.read_bytes()
    qualification_bytes = qualification_path.read_bytes()
    config = json.loads(config_bytes)
    qualification = json.loads(qualification_bytes)
    paths = config['playerCoreSources']
    if not isinstance(paths, list) or len(paths) != len(set(paths)):
        raise ValueError('Invalid core source inventory')
    for path in paths:
        pure = Path(path)
        if pure.is_absolute() or '..' in pure.parts or '\n' in path or '\r' in path or not (ROOT / pure).is_file():
            raise ValueError(f'Invalid or missing current input: {path}')
    revision = git('rev-parse', 'HEAD').decode().strip()
    baseline = head_blobs(paths, revision)
    recorded = qualification['sources']
    rows = []
    counts = {}
    for path in paths:
        current = sha((ROOT / path).read_bytes())
        head = baseline[path]
        reviewed = recorded.get(path)
        if head is None:
            origin = 'new-in-worktree'
        elif head != current:
            origin = 'modified-in-worktree'
        else:
            origin = 'unchanged-from-head'
        record = 'unrecorded' if reviewed is None else 'matches' if current == reviewed else 'differs'
        head_record = 'unrecorded' if reviewed is None else 'absent-at-head' if head is None else 'matches' if head == reviewed else 'differs'
        key = origin + ':' + record
        counts[key] = counts.get(key, 0) + 1
        rows.append({'path': path, 'worktreeSHA256': current, 'headSHA256': head,
                     'qualifiedSHA256': reviewed, 'origin': origin, 'qualification': record,
                     'headQualification': head_record})
    result = {'status': 'core-source-drift-inventory-not-review-or-release',
              'head': revision,
              'branch': git('branch', '--show-current').decode().strip(),
              'qualificationSHA256': sha(qualification_bytes),
              'qualificationStatus': qualification.get('status'),
              'coreInventorySHA256': sha(config_bytes),
              'auditScriptSHA256': sha(Path(__file__).read_bytes()),
              'recordedSources': len(recorded), 'currentInputs': len(paths),
              'counts': dict(sorted(counts.items())), 'inputs': rows,
              'limits': ['HEAD is a repository baseline, not a qualified source record.',
                         'Unchanged-from-HEAD does not establish reviewed or correct behavior.',
                         'Source hashes do not qualify a complete provider composition or grant release.',
                         'Only current playerCoreSources are classified; optional provider sources and tools need separate review.']}
    if git('rev-parse', 'HEAD').decode().strip() != revision:
        raise RuntimeError('HEAD changed during inventory')
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ['status', 'head', 'branch', 'recordedSources', 'currentInputs', 'counts']}))

if __name__ == '__main__':
    main()

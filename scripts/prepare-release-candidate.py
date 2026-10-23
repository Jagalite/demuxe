#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Bind an unpublished release candidate to a clean, exact CI checkout."""
import argparse
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def prepare(tag, commit, root=ROOT):
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root, text=True).strip()

    version = json.loads((root / 'package.json').read_text())['version']
    if not re.fullmatch(r'[0-9a-f]{40}', commit) or git('rev-parse', 'HEAD') != commit:
        raise ValueError('Qualification requires the exact checked-out commit SHA')
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', version) or tag != 'v' + version:
        raise ValueError('Candidate tag must match the package version')
    if git('status', '--porcelain'):
        raise ValueError('Candidate source must be clean')
    existing = subprocess.run(['git', 'rev-parse', '--verify', 'refs/tags/' + tag + '^{commit}'],
                              cwd=root, text=True, capture_output=True)
    if existing.returncode == 0:
        if existing.stdout.strip() != commit:
            raise ValueError('Existing candidate tag identifies a different commit')
    else:
        git('tag', tag, commit)
    return {'sourceTag': tag, 'sourceCommit': commit, 'publication': 'awaiting-approval'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--commit', required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.tag, args.commit), indent=2))

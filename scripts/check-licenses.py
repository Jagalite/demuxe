#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Check source boundaries, retained notices, SPDX headers and optional archives."""
import argparse
import subprocess
from license_policy import Policy, ROOT, archive_files

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--stamp-generated', action='store_true')
parser.add_argument('--archive')
parser.add_argument('--kind', choices=['core', 'player'], default='player')
args = parser.parse_args()
try:
    policy = Policy()
    if args.stamp_generated:
        policy.stamp_generated()
    policy.check()
    subprocess.run(['node', str(ROOT / 'scripts/check-core-boundary.mjs')], check=True, cwd=ROOT)
    if args.archive:
        policy.check_package(archive_files(args.archive), args.kind)
    print('License boundaries, SPDX headers and preserved notices verified' +
          ('; archive verified' if args.archive else ''))
except (ValueError, KeyError, FileNotFoundError, subprocess.CalledProcessError) as error:
    raise SystemExit(str(error))

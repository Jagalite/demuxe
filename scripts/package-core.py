#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Assemble a standalone, engine-free reusable package from an explicit allowlist."""
import argparse
import gzip
import io
import json
import subprocess
import tarfile
from pathlib import Path
from license_policy import Policy, ROOT, LEGAL, encoded

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT / 'build/core')
args = parser.parse_args()
subprocess.run(['python3', str(ROOT / 'scripts/check-licenses.py')], cwd=ROOT, check=True)
policy = Policy()
files = {name: (ROOT / name).read_bytes() for name in policy.core_files() | set(LEGAL)}
files['LICENSE'] = (ROOT / 'packages/core/LICENSE').read_bytes()
files['README.md'] = (ROOT / 'packages/core/README.md').read_bytes()
metadata = json.loads((ROOT / 'packages/core/package.json').read_text())
metadata.pop('private')
metadata.pop('scripts')
files['package.json'] = encoded(metadata)
files['license-map.json'] = encoded(policy.package_map(files, 'core'))
policy.check_package(files, 'core')
args.output.mkdir(parents=True, exist_ok=True)
out = args.output / f"{metadata['name']}-{metadata['version']}.tgz"
with out.open('wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as gz:
    with tarfile.open(fileobj=gz, mode='w', format=tarfile.PAX_FORMAT) as archive:
        for name, data in sorted(files.items()):
            entry = tarfile.TarInfo('package/' + name)
            entry.size = len(data)
            entry.mode = 0o644
            entry.mtime = 0
            archive.addfile(entry, io.BytesIO(data))
print(out)

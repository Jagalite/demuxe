# SPDX-License-Identifier: Apache-2.0
"""Reuse hash-verified comparison inputs with a fresh maintained streaming runtime."""
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

repo = pathlib.Path(__file__).resolve().parents[2]
base, out = map(lambda p: pathlib.Path(p).resolve(), sys.argv[1:])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = json.loads((base / 'manifest.json').read_text())
assert not out.exists(), 'Use a new snapshot directory'
for name, record in manifest['files'].items():
    assert sha(base / name) == record['sha256'], name
subprocess.run(['node', 'scripts/copy-shaka-assets.mjs'], cwd=repo, check=True)
out.mkdir(parents=True)
# Copy reusable inputs only. Nested historical preparation snapshots are referenced,
# not copied recursively into every new result folder.
for name in ['fixtures', 'packages', 'libmedia', 'libass']:
    if (base / name).exists():
        shutil.copytree(base / name, out / name)
shutil.copyfile(base / 'commands.json', out / 'commands.json')
player = out / 'demuxe'
(player / 'web').mkdir(parents=True)
sources = list((repo / 'src').rglob('*.ts')) + list((repo / 'web').glob('*.js'))
before = {str(p.relative_to(repo)): sha(p) for p in sources}
for p in (repo / 'web').glob('*.js'):
    shutil.copyfile(p, player / 'web' / p.name)
for name in ['engine-remux', 'engine-hybrid', 'engine-software-full', 'engine-adaptation', 'engine-ass', 'vendor']:
    if (repo / 'web' / name).is_dir():
        shutil.copytree(repo / 'web' / name, player / 'web' / name)
for name in ['LICENSE', 'LICENSES', 'third_party', 'docs/LICENSING.md', 'docs/MEDIA-NOTICES.md', 'fixtures/DejaVuSans.ttf', 'fixtures/FONT-LICENSE.txt']:
    target = player / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if (repo / name).is_dir():
        shutil.copytree(repo / name, target)
    else:
        shutil.copyfile(repo / name, target)
subprocess.run(['node', 'node_modules/typescript/bin/tsc', '--outDir', str(player / 'web/generated')], cwd=repo, check=True)
assert before == {str(p.relative_to(repo)): sha(p) for p in sources}, 'Source changed during capture'
manifest['streaming_refactor'] = {'parent': str(base), 'parent_manifest_sha256': sha(base / 'manifest.json'), 'sources': before, 'scope': 'Maintained Shaka production route; unchanged source fixtures and comparison dependencies'}
manifest['git_revision'] = subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
manifest['files'] = {str(p.relative_to(out)): {'sha256': sha(p), 'bytes': p.stat().st_size} for p in sorted(out.rglob('*')) if p.is_file()}
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(out)

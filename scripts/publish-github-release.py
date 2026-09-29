#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Attach qualified archives to a draft, then publish the complete GitHub Release."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('npm_release', ROOT / 'scripts/publish-npm-release.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def gh(*args):
    return subprocess.check_output(['gh', *map(str, args)], text=True)


def publish(directory, tag, commit, repo):
    verify.validate(directory, tag, commit)
    files = sorted(path for path in directory.iterdir() if path.is_file())
    # Distinguish absence from API/authentication failure without swallowing errors.
    releases = json.loads(gh('api', '--paginate', '--slurp', f'repos/{repo}/releases?per_page=100'))
    found = [r for page in releases for r in page if r['tag_name'] == tag]
    if len(found) > 1:
        raise ValueError('Multiple releases for one tag')
    if not found:
        gh('release', 'create', tag, '--repo', repo, '--verify-tag', '--draft', '--prerelease',
           '--title', tag, '--notes', 'Qualified developer beta. Runtime and corresponding source archives are attached. npm publication awaits maintainer approval in Staged Packages.')
    release = json.loads(gh('release', 'view', tag, '--repo', repo, '--json', 'isDraft,assets'))
    names = {entry['name'] for entry in release['assets']}
    with tempfile.TemporaryDirectory() as temporary:
        for path in files:
            if path.name in names:
                gh('release', 'download', tag, '--repo', repo, '--pattern', path.name, '--dir', temporary)
                if verify.digest(Path(temporary) / path.name) != verify.digest(path):
                    raise ValueError('Existing release asset differs; use a new version/tag: ' + path.name)
            elif release['isDraft']:
                gh('release', 'upload', tag, path, '--repo', repo)
            else:
                raise ValueError('Published release is incomplete; refusing to modify it: ' + path.name)
    if release['isDraft']:
        gh('release', 'edit', tag, '--repo', repo, '--draft=false', '--prerelease', '--latest=false')
    print(f'Published verified GitHub Release: https://github.com/{repo}/releases/tag/{tag}')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--assets', type=Path, required=True)
    p.add_argument('--tag', required=True)
    p.add_argument('--commit', required=True)
    p.add_argument('--repo', required=True)
    a = p.parse_args()
    publish(a.assets, a.tag, a.commit, a.repo)

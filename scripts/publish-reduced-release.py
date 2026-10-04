#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Validate explicit reduced evidence; optionally publish GitHub or stage exact npm bytes.

Full qualification publishers and verification.json semantics remain unchanged.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
from reduced_release import validate, asset, digest, require

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('full_npm_publisher',ROOT/'scripts/publish-npm-release.py')
full=importlib.util.module_from_spec(spec);spec.loader.exec_module(full)

def gh(*args):
    return subprocess.check_output(['gh',*map(str,args)],text=True)

def publish(directory,tag,commit,repo):
    validate(directory,tag,commit)
    ref=json.loads(gh('api',f'repos/{repo}/git/ref/tags/{tag}'))['object']
    seen=set()
    while ref['type']=='tag':
        require(ref['sha'] not in seen,'Annotated tag cycle');seen.add(ref['sha'])
        ref=json.loads(gh('api',f'repos/{repo}/git/tags/{ref["sha"]}'))['object']
    require(ref['type']=='commit' and ref['sha']==commit,'Remote release tag differs from validated commit')
    record=json.loads(asset(directory,'reduced-qualification.json').read_text())
    names={'reduced-qualification.json',record['runtime']['file'],record['source']['file'],record['gate']['file'],record['bindings']['file'],record['gateController']['file'],record['releaseNotes']['file'],record['installedManifest']['file'],record['nativeCorrespondence']['file']}
    names.update(e['file'] for e in record['evidenceFiles'])
    # Validator checked each manifest-declared optional companion.
    import tarfile
    with tarfile.open(directory/record['runtime']['file']) as tar:
        manifest=json.load(tar.extractfile('package/release-manifest.json'))
        for name in manifest['files']:
            if name.startswith('web/engine-') and name.endswith('/manifest.json'):
                optional=json.load(tar.extractfile('package/'+name))
                if 'sourceCompanion' in optional:names.add(optional['sourceCompanion']['filename'])
    pages=json.loads(gh('api','--paginate','--slurp',f'repos/{repo}/releases?per_page=100'))
    found=[r for page in pages for r in page if r['tag_name']==tag];require(len(found)<=1,'Duplicate release tag')
    if not found:
        gh('release','create',tag,'--repo',repo,'--verify-tag','--draft','--prerelease','--title',tag,'--notes-file',asset(directory,record['releaseNotes']['file']))
    release=json.loads(gh('release','view',tag,'--repo',repo,'--json','isDraft,assets'))
    existing={item['name'] for item in release['assets']}
    require(existing<=names,'Unexpected existing release assets; review separately')
    with tempfile.TemporaryDirectory() as temporary:
        for name in sorted(names):
            path=asset(directory,name)
            if name in existing:
                gh('release','download',tag,'--repo',repo,'--pattern',name,'--dir',temporary)
                require(digest(Path(temporary)/name)==digest(path),'Existing release asset differs: '+name)
            else:
                require(release['isDraft'],'Published release incomplete; refusing mutation')
                gh('release','upload',tag,path,'--repo',repo)
    if release['isDraft']:gh('release','edit',tag,'--repo',repo,'--draft=false','--prerelease','--latest=false')
    print(f'Published reduced-scope prerelease: https://github.com/{repo}/releases/tag/{tag}')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--assets',type=Path,required=True);p.add_argument('--tag',required=True);p.add_argument('--commit',required=True)
    action=p.add_mutually_exclusive_group();action.add_argument('--stage',action='store_true');action.add_argument('--github',action='store_true');p.add_argument('--repo');a=p.parse_args()
    archive,version=validate(a.assets,a.tag,a.commit)
    if a.github:
        require(bool(a.repo),'--repo required for GitHub publication');publish(a.assets,a.tag,a.commit,a.repo)
    elif a.stage:full.stage(archive,version)
    else:print(f'Validated reduced-scope demuxe@{version}: {archive.name} ({digest(archive)})')

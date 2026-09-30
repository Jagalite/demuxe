#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Retain current application/glue source alongside the native source companions."""
import argparse,gzip,hashlib,io,json,tarfile,subprocess
from pathlib import Path
from license_policy import ROOT,Policy
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--qualification',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
def sha(b):return hashlib.sha256(b).hexdigest()
qualification=json.loads(a.qualification.read_bytes());assert qualification['passed']
config=json.loads((ROOT/'licensing/provider-packages.json').read_bytes());policy=Policy()
names={config['targets']['core']['template']};names.update(config['playerCoreSources']);names.update(subprocess.check_output(['rg','--files','src','-g','*.ts'],cwd=ROOT,text=True).splitlines())
for target in ['container','audio-truehd-mlp','audio-dts-hd','audio-flac','ffmpeg-truehd-mlp-asyncify','ffmpeg-truehd-mlp-jspi','ffmpeg-dts-hd-asyncify','ffmpeg-dts-hd-jspi']:
 profile=config['profiles'][target];names.update(profile.get('sources',[]));names.update(profile.get('files',[]))
 names.update([config['targets'][target]['template'],f'packages/provider-{target}/index.js',f'packages/provider-{target}/index.d.ts'])
names.update(['README.md','package.json','package-lock.json','tsconfig.json','licensing/provider-packages.json','licensing/provider-runtime-qualification.json','licensing/boundaries.json','docs/CODEC-SPLIT-PRODUCTION.md','docs/PROVIDER-RELINK.md','scripts/compile-player-package.mjs','scripts/package-player-core.py','scripts/compile-provider-sources.mjs','scripts/compile-component-providers.mjs','scripts/prepare-provider-package.py','scripts/qualify-codec-providers.py','scripts/verify-codec-source-gates.py','scripts/package-codec-application-source.py','scripts/build-codec-preparation.py','scripts/record-codec-preparation-build.py','scripts/build-audio-providers.py','scripts/record-audio-provider-build.py','scripts/setup-codec-preparation-consumer.mjs','scripts/setup-lossless-component-consumer.mjs','scripts/deploy-providers.py','scripts/audit-provider-package.py','scripts/license_policy.py','scripts/package-provider.py'])
for path in (ROOT/'LICENSES').iterdir():
 if path.is_file():names.add(str(path.relative_to(ROOT)))
names.update(item['path'] for item in json.loads((ROOT/'licensing/provider-runtime-qualification.json').read_bytes())['evidence'])
names.update(['scripts/check-licenses.py','scripts/check-core-boundary.mjs','scripts/shaka_source.py'])
names.add('scripts/verify-codec-application-source.py')
names.update(['scripts/modular-release.py','scripts/publish-github-release.py','.github/workflows/modular-release.yml','.github/workflows/pages.yml','.github/workflows/licensing.yml','tests/modular-release.py'])
files={name:(ROOT/name).read_bytes()for name in sorted(names)}
# Compiler programs use the core source set and target profile source lists.
# Include generated helper preferred input descriptions as build records.
companions=[]
for package in qualification['packages']:
 inventory=json.loads(Path(package['record']).read_bytes());companion=inventory.get('sourceCompanion')
 if companion and companion not in companions:companions.append(companion)
manifest={'schema':1,'coreArchiveSHA256':qualification['coreArchiveSHA256'],'qualificationEvidenceSHA256':sha(json.dumps({key:qualification[key] for key in ['coreArchiveSHA256','packages','gates']},sort_keys=True).encode()),'files':{name:{'sha256':sha(data),'license':policy.classify(name)}for name,data in files.items()},'nativeSourceCompanions':companions,'scope':'Current preferred application/glue source and build configuration, with per-file licenses retained; native libraries, static archives, transformed C and SDK preferred source remain in the exact native companions listed here.'}
a.output.parent.mkdir(parents=True,exist_ok=True)
with a.output.open('wb') as raw,gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0) as gz,tarfile.open(fileobj=gz,mode='w',format=tarfile.PAX_FORMAT) as tar:
 for name,data in sorted(files.items()):
  info=tarfile.TarInfo('demuxe/'+name);info.size=len(data);info.mode=0o644;info.mtime=0;tar.addfile(info,io.BytesIO(data))
 data=(json.dumps(manifest,indent=2,sort_keys=True)+'\n').encode();info=tarfile.TarInfo('application-source-manifest.json');info.size=len(data);info.mode=0o644;info.mtime=0;tar.addfile(info,io.BytesIO(data))
# Verify the written bytes, every retained source digest and native references.
with tarfile.open(a.output,'r:gz') as tar:
 for name,fact in manifest['files'].items():assert sha(tar.extractfile('demuxe/'+name).read())==fact['sha256']
 for companion in companions:
  source=ROOT/companion['repositoryPath'];assert sha(source.read_bytes())==companion['sha256']
report={'passed':True,'archive':str(a.output.absolute()),'sha256':sha(a.output.read_bytes()),'files':len(files),'coreArchiveSHA256':manifest['coreArchiveSHA256'],'nativeSourceCompanions':companions}
a.output.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

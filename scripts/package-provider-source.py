#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Recover a hash-exact corresponding-source companion for the pthread providers.

Input locations may differ from the original build; contents may not. The three
subtitle-service configurations are excluded because neither provider ships that
service. The original (possibly dirty) build record is retained without rewriting.
"""
import argparse, gzip, hashlib, io, json
from pathlib import Path
import tarfile
from license_policy import ROOT, encoded, sha

EXCLUDED = {'build/subtitle-service/link-command.json','build/subtitle-service/manifest.json','build/link-maps/subtitles.map'}

def assemble(record_path, recovered_path, build_root, output, profile_name=None):
    config=json.loads((ROOT/'licensing/provider-packages.json').read_bytes())
    excluded=set(config['profiles'][profile_name].get('excludedSourceConfigurations',[])) if profile_name else EXCLUDED
    record = json.loads(record_path.read_bytes())
    recovered = json.loads(recovered_path.read_bytes())['recovered']
    paths = {}
    def add(name, path, digest=None):
        path = Path(path)
        if not path.is_file(): raise ValueError('Missing source: '+str(path))
        actual = sha(path.read_bytes())
        if digest and actual != digest: raise ValueError('Source hash mismatch: '+str(path))
        paths[name] = (path, actual)
    for name, digest in record['inputs'].items(): add('demuxe/'+name, recovered[name], digest)
    for name, digest in record['configurations'].items():
        if name not in excluded: add('build-materials/'+name, build_root/name, digest)
    for name, digest in record['sources'].items(): add('demuxe/build/downloads/'+name+'.tar.gz',build_root/'build/downloads'/(name+'.tar.gz'),digest)
    for name, digest in record['sdkSources'].items(): add('toolchain/emscripten/'+name,Path(record['sdk'])/'upstream/emscripten'/name,digest)
    # Current application/provider integration source, separately named so it
    # never overwrites the original native-build inputs.
    config=json.loads((ROOT/'licensing/provider-packages.json').read_bytes())
    current=set(config['playerCoreSources'])
    for profile in config['profiles'].values():
        current.update(profile.get('sources', []));current.update(profile['files']);current.update(name.replace('web/generated/','src/').replace('.js','.ts') for name in profile['generated'])
    current.update(str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*.ts'))
    for target in {str(Path(t['template']).parent.relative_to('packages')) for t in config['targets'].values()}:
        current.update(str(p.relative_to(ROOT)) for p in (ROOT/'packages'/target).rglob('*') if p.is_file())
    current.update(item['path'] for item in json.loads((ROOT/'licensing/provider-runtime-qualification.json').read_bytes())['evidence'])
    current.update('scripts/'+name for name in ['compile-player-package.mjs','compile-component-providers.mjs','compile-provider-sources.mjs','build-audio-providers.py','record-audio-provider-build.py','prepare-lossless-audio-fixtures.mjs','setup-lossless-component-consumer.mjs','package-player-core.py','package-provider.py','package-provider-source.py','prepare-provider-package.py','audit-provider-package.py','deploy-providers.py','license_policy.py'])
    current.update(str(p.relative_to(ROOT)) for p in (ROOT/'tests').glob('provider-lossless-*.mjs'))
    for pattern in ['codec-expansion-*.mjs','decoder-families.mjs','decoder-family-fixtures.py','provider-opus-*.mjs','provider-flac-regression.mjs','provider-flac-lowrates.mjs','provider-flac-lowrate-mux.mjs','provider-owner-failures.mjs','ac3-fullfile-*.mjs','audio-coverage*.mjs','audio-coverage*.py','isobmff-*.mjs','isobmff-*.py','codec-expansion-extract.py','legacy-audio*.mjs','legacy-audio*.py','archive-audio*.mjs','archive-audio*.py','component-audio-expansion.mjs','wma-format.mjs','provider-wavpack*.mjs','provider-ape*.mjs','provider-webm*.mjs','webm-installed-*.mjs','webm-installed-*.py','wma-advanced*.mjs','wma-advanced*.py','tak-audio*.mjs','tak-audio*.py','provider-tak*.mjs','tta-audio*.mjs','lossless-audio-extension*.mjs','lossless-audio-extension*.py','lossless-audio-historical*.mjs','lossless-audio-historical*.py','shorten-audio*.mjs','shorten-audio*.py','provider-shorten*.mjs','aac-extension*.mjs','aac-extension*.py','provider-aac*.mjs','flac-low-rate*.mjs','flac-low-rate*.py','adpcm-wave*.mjs','adpcm-wave*.py','adpcm-qt*.mjs','adpcm-qt*.py','g726*.mjs','g726*.py','provider-g726*.mjs','provider-adpcm*.mjs','telephony-*.mjs','telephony-*.py','provider-telephony*.mjs','provider-usac*.mjs','speech-audio*.mjs','speech-audio*.py','provider-pcm8*.mjs','tta-audio*.py','archive-*.mjs','provider-ogg*.mjs','provider-wave-aiff*.mjs','mpegts-*.mjs','mpegts-*.py']:
        current.update(str(p.relative_to(ROOT)) for p in (ROOT/'tests').glob(pattern))
    current.update(['scripts/audio_source_policy.py','tests/audio-source-policy.py','scripts/prepare-aac-extensions.mjs','scripts/prepare-usac-fixtures.mjs','scripts/prepare-pcm8-fixtures.mjs','scripts/build-speech-reference.py','scripts/build-adpcm-qt-reference.py','scripts/build-g726-reference.py','scripts/prepare-g726-fixtures.py','scripts/media-reference-environment.mjs','tests/media-reference-environment-contracts.mjs','scripts/setup-codec-expansion-consumer.mjs','scripts/prepare-wave-browser-fixtures.mjs','scripts/prepare-ogg-browser-fixtures.mjs','scripts/prepare-webm-browser-fixtures.mjs','scripts/setup-webm-installed-consumer.mjs','scripts/webm-installed-inputs.mjs','scripts/extract-webm-installed-inputs.py','scripts/build-opus-provider.py','docs/OPUS-PROVIDER-SOURCE.md','scripts/codec-expansion-ci.mjs','scripts/extract-codec-expansion-ci.py','docs/CODEC-EXPANSION-CI.md','docs/AUDIO-COVERAGE-EXPANSION.md','docs/ARCHIVE-AUDIO-SPLIT.md','docs/LEGACY-AUDIO-SPLIT.md','docs/ISOBMFF-PROVIDER.md','docs/MPEGTS-PROVIDER.md','docs/CONTAINER-CODEC-NEXT.md','docs/OGG-AUDIO-READER.md','docs/WEBM-PACKET-COPY.md','docs/APE-STANDALONE-READER.md','docs/APE-PROVIDER.md','docs/WAVPACK-PROVIDER.md','docs/TTA-AUDIO-SPLIT.md','docs/LOSSLESS-AUDIO-EXTENSIONS.md','docs/WMA-ADVANCED-AUDIO-SPLIT.md','docs/TAK-PROVIDER.md','docs/TAK-AUDIO-SPLIT.md','docs/SHORTEN-AUDIO-SPLIT.md','docs/AAC-EXTENSIONS.md','docs/USAC-FINITE-PROFILE.md','docs/TELEPHONY-PROVIDER.md','docs/TELEPHONY-AUDIO-SPLIT.md','docs/SPEECH-AUDIO-SPLIT.md','docs/PCM8-WAVE-AIFF.md','docs/FLAC-LOW-RATE-OUTPUT.md','docs/ADPCM-WAVE-READER.md','docs/SPEECH-ADPCM-AAC-INVENTORY.md','docs/INSTALLED-AUDIO-762-QUALIFICATION.md','docs/INSTALLED-AUDIO-PRIORITY-296-QUALIFICATION.md','.github/workflows/codec-expansion.yml','.github/workflows/webm-packet-copy.yml'])
    current.update(['docs/CODEC-SPLIT-PRODUCTION.md','licensing/boundaries.json','licensing/provider-runtime-qualification.json','docs/PROVIDER-RELINK.md','docs/LGPL-RELINK.md','licensing/provider-packages.json','tsconfig.json','package.json','package-lock.json'])
    current.update(str(p.relative_to(ROOT)) for p in (ROOT/'LICENSES').glob('*.txt'))
    current.update(str(p.relative_to(ROOT)) for p in (ROOT/'tests/provider-conformance').glob('*.mjs'))
    current.update(['scripts/test-providers.mjs','tests/provider-conformance-installed.mjs','docs/PROVIDER-TESTING.md','.github/workflows/provider-conformance.yml'])
    for name in sorted(current):add('application/'+name,ROOT/name)
    add('engine-build.json',record_path)
    manifest={'schema':1,'engineBuildSHA256':sha(record_path.read_bytes()),'excludedConfigurations':sorted(excluded),'files':{name:digest for name,(_,digest) in paths.items()}}
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open('xb') as raw,gzip.GzipFile(filename='',fileobj=raw,mode='wb',mtime=0) as gz,tarfile.open(fileobj=gz,mode='w|') as archive:
        for name,(path,digest) in sorted(paths.items()):
            data=path.read_bytes()
            if sha(data)!=digest:raise ValueError('Source changed during packaging: '+str(path))
            entry=tarfile.TarInfo(name);entry.size=len(data);entry.mode=0o755 if path.stat().st_mode&0o111 else 0o644;entry.mtime=0;archive.addfile(entry,io.BytesIO(data))
        data=encoded(manifest);entry=tarfile.TarInfo('source-manifest.json');entry.size=len(data);entry.mode=0o644;archive.addfile(entry,io.BytesIO(data))
    digest=hashlib.sha256()
    with output.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):digest.update(chunk)
    result={'repositoryPath':str(output.relative_to(ROOT)),'filename':output.name,'sha256':digest.hexdigest(),'files':len(paths),'engineBuildSHA256':manifest['engineBuildSHA256']}
    output.with_suffix('.json').write_bytes(encoded(result));print(json.dumps(result,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--profile');p.add_argument('--record',type=Path,required=True);p.add_argument('--recovered',type=Path,required=True);p.add_argument('--build-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();assemble(a.record,a.recovered,a.build_root,a.output.absolute(),a.profile)

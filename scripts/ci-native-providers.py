#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Assemble current broad providers after a clean CI engine build and unified link."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil

from license_policy import ROOT, encoded, sha
from mpv_composite_source import portable_private_record, verify_groups

spec = importlib.util.spec_from_file_location('ci_slices', ROOT / 'scripts/ci-slices.py')
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)


def composite(beta, unified, output):
    """Retain both fresh native groups under the existing composite-source audit."""
    output.mkdir(parents=True, exist_ok=False)
    pthread = copy.deepcopy(beta)
    pthread.pop('privateMpv', None)
    pthread.pop('privateRemux', None)
    pthread['artifacts'] = {}
    # Bind every unified linker input plus generated sources, commands and map.
    linked = json.loads((unified / 'build-record.json').read_text())
    for filename, digest in linked['inputs'].items():
        path = Path(filename)
        if not path.resolve().is_relative_to(ROOT) or ci.sha(path) != digest:
            raise ValueError('Unified input drift or path outside checkout: ' + filename)
        pthread['inputs'][str(path.relative_to(ROOT))] = digest
    for path in unified.iterdir():
        if path.is_file() and path.suffix in ['.c', '.json', '.map', '.py']:
            pthread['configurations'][str(path.relative_to(ROOT))] = ci.sha(path)
    for leaf in ['player.mjs', 'player.wasm']:
        source = unified / leaf
        fact = linked['outputs'][leaf]
        if ci.sha(source) != fact['sha256'] or source.stat().st_size != fact['bytes']:
            raise ValueError('Unified output drift')
        dest = ROOT / 'web/engine-mpv' / leaf
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, dest)
        pthread['artifacts'][str(dest.relative_to(ROOT))] = fact
    private = portable_private_record(beta)
    engine = {'schema': 1, 'clean': beta['clean'], 'qualification': 'ci-candidate',
              'nativeGroups': {}, **{kind: {} for kind in ['inputs', 'configurations', 'sources', 'sdkSources', 'artifacts']}}
    recovered, runtime = {}, {}
    excluded = {'build/link-maps/subtitles.map', 'build/subtitle-service/link-command.json', 'build/subtitle-service/manifest.json'}

    def retain(name, data):
        path = output / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        engine['inputs'][name] = sha(data)
        recovered[name] = str(path)
        return name

    for ident, native in [('pthread', pthread), ('private-playback', private)]:
        names = {kind: set(native[kind]) for kind in ['inputs', 'configurations', 'sources', 'sdkSources']}
        if ident == 'pthread':
            names['configurations'] -= excluded
            artifacts = set(native['artifacts'])
        else:
            roots = [f'web/engine-mpv-playback-{rt}' for rt in ['jspi', 'asyncify']]
            for kind in ['inputs', 'configurations']:
                names[kind] = set().union(*(set(native['privateMpv'][root][kind]) for root in roots))
            artifacts = {root + '/' + leaf for root in roots for leaf in ['player.mjs', 'player.wasm', 'manifest.json']}
        maps, manifest = {}, {'files': {}, 'excludedConfigurations': sorted(excluded) if ident == 'pthread' else []}
        for kind, prefix, recovery_prefix in [('inputs', 'demuxe/', ''), ('configurations', 'build-materials/', 'build-materials/'),
                                               ('sources', 'demuxe/build/downloads/', 'build/downloads/'),
                                               ('sdkSources', 'toolchain/emscripten/', 'toolchain/emscripten/')]:
            maps[kind] = {}
            for name in sorted(names[kind]):
                suffix = '.tar.gz' if kind == 'sources' else ''
                path = (Path(beta['sdk']) / 'upstream/emscripten' / name if kind == 'sdkSources' else
                        ROOT / 'build/downloads' / (name + suffix) if kind == 'sources' else ROOT / name)
                digest = native[kind][name]
                if ci.sha(path) != digest:
                    raise ValueError('Preferred source drift: ' + str(path))
                ns = name if kind == 'sdkSources' else f'native-groups/{ident}/{name}'
                if ns in engine[kind] and engine[kind][ns] != digest:
                    raise ValueError('Native source collision')
                engine[kind][ns] = digest
                recovered[recovery_prefix + ns + suffix] = str(path)
                maps[kind][name] = ns
                manifest['files'][prefix + name + suffix] = digest
        raw = encoded(native)
        record_name = retain(f'native-groups/{ident}/original-engine-build.json', raw)
        manifest['files']['engine-build.json'] = sha(raw)
        group = {'recordInput': record_name, 'recordSHA256': sha(raw), 'maps': maps,
                 'artifacts': sorted(artifacts), 'runtimeFiles': sorted(artifacts),
                 'excludedConfigurations': manifest['excludedConfigurations']}
        if ident == 'private-playback':
            source = (ROOT / 'build/beta-build.json').read_bytes()
            name = retain('native-groups/private-playback/original-source-build.json', source)
            group.update(sourceBuildInput=name, sourceBuildSHA256=sha(source))
            manifest['files']['build-materials/build/beta-build.json'] = sha(source)
        manifest_bytes = encoded(manifest)
        name = retain(f'native-groups/{ident}/original-source-manifest.json', manifest_bytes)
        group.update(sourceManifestInput=name, sourceManifestSHA256=sha(manifest_bytes))
        for name in artifacts:
            data = (ROOT / name).read_bytes()
            if sha(data) != native['artifacts'][name]['sha256']:
                raise ValueError('Native output changed: ' + name)
            runtime[name] = data
            engine['artifacts'][name] = native['artifacts'][name]
        engine['nativeGroups'][ident] = group
    verify_groups(engine, lambda name: Path(recovered[name]).read_bytes(), runtime)
    ci.write(output / 'engine-build.json', engine)
    ci.write(output / 'recovered.json', {'recovered': recovered})


def main():
    beta = json.loads((ROOT / 'build/beta-build.json').read_text())
    if beta.get('clean') is not True:
        raise ValueError('CI providers require a fresh complete engine build')
    output = ROOT / 'build/ci-native'
    output.mkdir(parents=True, exist_ok=False)
    unified = output / 'unified'
    ci.run('python3', 'scripts/build-unified-mpv.py', '--native-root', ROOT, '--sdk', beta['sdk'], '--output', unified)
    composite(beta, unified, output / 'mpv-provenance')
    provenance = output / 'beta-provenance'
    ci.write(provenance / 'engine-build.json', beta)
    ci.write(provenance / 'recovered.json', {'recovered': {name: str(ROOT / name) for name in beta['inputs']}})
    for target in ['ffmpeg', 'ffmpeg-jspi', 'ffmpeg-asyncify', 'mpv']:
        dest = ROOT / 'build/ci-slices' / target
        dest.mkdir(parents=True, exist_ok=False)
        assembly = ci.package(target, dest, output / 'mpv-provenance' if target == 'mpv' else provenance)
        ci.receipt(target, dest, assembly)


if __name__ == '__main__':
    main()

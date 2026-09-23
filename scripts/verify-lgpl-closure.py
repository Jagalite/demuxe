#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Fail closed on the generated configuration and link maps of LGPL engines."""
import argparse
import fnmatch
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
KINDS = ('DECODER', 'DEMUXER', 'PARSER', 'BSF', 'FILTER', 'ENCODER',
         'MUXER', 'PROTOCOL', 'HWACCEL')
REQUIRED_DECODERS = '''H264 HEVC AV1 VP8 VP9 MPEG1VIDEO MPEG2VIDEO MPEG4
PRORES FFV1 DNXHD VC1 THEORA AAC MP3 MP2 OPUS VORBIS FLAC AC3 EAC3 DCA
TRUEHD MLP PCM_S16LE WMAV1 WMAV2 WMAPRO WMALOSSLESS RA_144 RA_288 COOK
SIPR ASS SSA SUBRIP MOVTEXT WEBVTT PGSSUB DVDSUB DVBSUB'''.split()
REQUIRED_DEMUXERS = 'MOV MATROSKA MPEGTS MPEGPS AVI OGG HLS DASH'.split()
REQUIRED_FILTERS = '''SCALE ZSCALE FORMAT COLORSPACE TONEMAP TRANSPOSE CROP FPS
ARESAMPLE AFORMAT ATEMPO BWDIF YADIF W3FDIF'''.split()
FORBIDDEN_MPV = ('audio/out/ao_jack.c', 'audio/out/ao_oss.c',
                 'stream/stream_cdda.c', 'stream/stream_dvdnav.c',
                 'video/out/vo_caca.c', 'video/out/vo_direct3d.c',
                 'video/out/vo_vaapi.c', 'video/out/vo_vdpau.c',
                 'video/out/vo_x11.c', 'video/out/vo_xv.c',
                 'video/out/x11_common.c', 'video/vdpau.c',
                 'video/vdpau_mixer.c')


def mpv_gpl_patterns(copyright_text):
    marker = 'The following files are still GPL only (-Dgpl=false disables them):'
    if marker not in copyright_text:
        raise ValueError('Missing pinned mpv GPL-only source inventory')
    block = copyright_text.split(marker, 1)[1].lstrip('\n').split('\n\n', 1)[0]
    patterns = []
    for line in block.splitlines():
        item = line.strip().split(maxsplit=1)[0] if line.strip() else ''
        if item.startswith(('audio/', 'stream/', 'video/')):
            patterns.append(item)
    if not patterns:
        raise ValueError('Empty pinned mpv GPL-only source inventory')
    return patterns


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def define(text, name):
    match = re.search(rf'^#define {re.escape(name)} (.+)$', text, re.M)
    if not match:
        raise ValueError(f'Missing generated definition: {name}')
    return match[1]


def components(path):
    text = path.read_text()
    return {kind.lower(): sorted(re.findall(
        rf'^#define CONFIG_(\w+)_{kind} 1$', text, re.M)) for kind in KINDS}


def forbidden_external_libraries(configure):
    names = set()
    for group in ('GPL', 'NONFREE', 'GPLV3'):
        block = re.search(rf'^EXTERNAL_LIBRARY_{group}_LIST="(.*?)"', configure, re.M | re.S)
        if not block:
            raise ValueError(f'Missing FFmpeg external {group} license list')
        names.update(block[1].split())
    return sorted(names)


def ffmpeg_license(root, label, folder, full):
    config = folder / 'config.h'
    text = config.read_text()
    for flag in ('GPL', 'GPLV3', 'NONFREE', 'VERSION3', 'POSTPROC'):
        if define(text, 'CONFIG_' + flag) != '0':
            raise ValueError(f'{label}: CONFIG_{flag} must be 0')
    if define(text, 'FFMPEG_LICENSE') != '"LGPL version 2.1 or later"':
        raise ValueError(f'{label}: FFmpeg does not report LGPL-2.1-or-later')
    selection = components(folder / 'config_components.h')
    if full:
        for kind, names in [('decoder', REQUIRED_DECODERS),
                            ('demuxer', REQUIRED_DEMUXERS),
                            ('filter', REQUIRED_FILTERS)]:
            missing = sorted(set(names) - set(selection[kind]))
            if missing:
                raise ValueError(f'{label}: required {kind} removed: {missing}')
        configure = (root / 'build/sources/ffmpeg/configure').read_text()
        for name in forbidden_external_libraries(configure):
            macro = 'CONFIG_' + name.upper().replace('-', '_')
            if re.search(rf'^#define {macro} 1$', text, re.M):
                raise ValueError(f'{label}: GPL/nonfree external dependency enabled: {name}')
        for name, deps in re.findall(r'^([a-z0-9_]+)_filter_deps="([^"]*)"', configure, re.M):
            if 'gpl' in deps.split() and name.upper() in selection['filter']:
                raise ValueError(f'{label}: GPL-only FFmpeg filter enabled: {name}')
        request = (folder / 'configure-request').read_text()
        if ('--enable-gpl' in request or '--enable-nonfree' in request or
                '--disable-postproc' not in request or '--disable-asm' not in request):
            raise ValueError('Software FFmpeg configure request is not LGPL-safe')
    return {'license': 'LGPL-2.1-or-later', 'configSHA256': digest(config),
            'componentsSHA256': digest(folder / 'config_components.h'),
            'components': selection, 'counts': {k: len(v) for k, v in selection.items()}}


def verify(root, baseline=None):
    mpv = root / 'build/obj-mpv'
    options = json.loads((mpv / 'meson-info/intro-buildoptions.json').read_text())
    option = {entry['name']: entry['value'] for entry in options}
    expected = {'gpl': False, 'libmpv': True, 'cplayer': False, 'gl': 'disabled', 'lua': 'disabled'}
    for name, value in expected.items():
        if option.get(name) != value:
            raise ValueError(f'mpv {name} must equal {value!r}')
    commands = json.loads((mpv / 'compile_commands.json').read_text())
    built = [str(entry['file']).replace('\\', '/') for entry in commands]
    copyright_path = root / 'build/sources/mpv/Copyright'
    gpl_patterns = mpv_gpl_patterns(copyright_path.read_text())
    for name in built:
        if any(name.endswith('/' + forbidden) for forbidden in FORBIDDEN_MPV) or re.search(
                r'/stream/(?:dvb[^/]*|stream_dvb[^/]*)\.c$', name) or any(
                    fnmatch.fnmatchcase(name, '*/' + pattern) for pattern in gpl_patterns):
            raise ValueError('GPL-only mpv source compiled: ' + name)
    baseline_ffmpeg = ffmpeg_license(root, 'baseline', root / 'build/obj-ffmpeg', False)
    ffmpeg = ffmpeg_license(root, 'full', root / 'build/obj-software-full-ffmpeg', True)
    remux = ffmpeg_license(root, 'remux', root / 'build/native-remux/ffmpeg', False)
    if (root / 'build/obj-software-full-ffmpeg/libpostproc/libpostproc.a').exists():
        raise ValueError('Full FFmpeg produced libpostproc')
    maps = {}
    external = forbidden_external_libraries((root / 'build/sources/ffmpeg/configure').read_text())
    for engine in ('baseline', 'software', 'hybrid', 'remux', 'subtitles'):
        path = root / f'build/link-maps/{engine}.map'
        text = path.read_text()
        if not text.strip():
            raise ValueError('Empty linker map: ' + engine)
        # vf_removegrain.c is LGPL; only its x86 assembly implementation is GPL.
        if re.search(r'libpostproc|(?:flac_dsp_gpl|idct_mmx|vf_lensfun)\.(?:o|obj|asm|c)\b|(?:x86/|x86\\)vf_removegrain\.(?:o|obj|asm)\b|vf_removegrain\.asm\b|(?:/|\\)(?:ao_jack|ao_oss|stream_dvb|vo_x11|vo_xv|vo_vdpau|vo_caca|vo_direct3d)\.c\b', text, re.I):
            raise ValueError('GPL-only input in linker map: ' + engine)
        for name in external:
            forms = {name, name if name.startswith('lib') else 'lib' + name}
            if any(re.search(rf'(?<![A-Za-z0-9_]){re.escape(form)}\.(?:a|so|dylib|o)\b', text, re.I)
                   for form in forms):
                raise ValueError(f'GPL/nonfree external library in linker map: {engine}: {name}')
        maps[engine] = {'sha256': digest(path), 'bytes': path.stat().st_size}
    subtitle = json.loads((root / 'build/subtitle-service/manifest.json').read_text())
    if subtitle['subtitleFFmpegConfigurationSHA256'] != ffmpeg['componentsSHA256']:
        raise ValueError('Subtitle service uses another FFmpeg component build')
    if pathlib.Path(subtitle['mpvBuildRoot']).resolve() != root.resolve():
        raise ValueError('Subtitle service uses external mpv build')
    for folder, stem in [('engine', 'player'), ('engine-software-full', 'player'),
                         ('engine-hybrid', 'player'), ('engine-remux', 'remux'),
                         ('engine-subtitles', 'service')]:
        linked = root / 'web' / folder / (stem + '.mjs')
        if not linked.read_bytes().startswith(b'// SPDX-License-Identifier: LGPL-2.1-or-later\n'):
            raise ValueError('Linked engine has missing/conflicting LGPL header: ' + str(linked))
    result = {'schema': 1, 'status': 'verified', 'mpv': {
        'license': 'LGPL-2.1-or-later', 'gpl': False,
        'optionsSHA256': digest(mpv / 'meson-info/intro-buildoptions.json'),
        'compileCommandsSHA256': digest(mpv / 'compile_commands.json'),
        'compiledSourceCount': len(built), 'gplSourceInventorySHA256': digest(copyright_path)},
        'baselineFFmpeg': baseline_ffmpeg, 'ffmpeg': ffmpeg, 'remuxFFmpeg': remux, 'linkMaps': maps,
        'subtitleService': {'manifestSHA256': digest(root / 'build/subtitle-service/manifest.json')}}
    if baseline:
        old = components(baseline / 'build/obj-software-full-ffmpeg/config_components.h')
        result['beforeAfter'] = {kind: {'before': len(old[kind]), 'after': len(names),
                                        'removed': sorted(set(old[kind]) - set(names)),
                                        'added': sorted(set(names) - set(old[kind]))}
                                 for kind, names in ffmpeg['components'].items()}
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=pathlib.Path)
    parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'build/lgpl-closure.json')
    args = parser.parse_args()
    try:
        result = verify(ROOT, args.baseline)
    except (ValueError, KeyError, FileNotFoundError) as error:
        raise SystemExit(str(error))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(args.output)

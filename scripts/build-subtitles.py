# SPDX-License-Identifier: Apache-2.0
"""Link the optional subtitle service from the existing pinned mpv build.

Legacy external caches are rebuilt into an isolated archive with normalized
configuration paths. Neither cached sources nor cached libraries are modified.
"""
import concurrent.futures
import hashlib
import json
import os
import pathlib
import re
import shlex
import shutil
import subprocess

repo = pathlib.Path(__file__).resolve().parents[1]
base = pathlib.Path(os.environ.get('DEMUXE_MPV_BUILD_ROOT', str(repo))).resolve()
if base == repo:
    # Direct subtitle-service builds must not link an archive predating the
    # locked raw-timing adaptation. The normal build already runs this replay.
    subprocess.run(['python3', str(repo / 'scripts/apply-patches.py')], check=True)
    subprocess.run(['ninja', '-C', str(base / 'build/obj-mpv'), 'libmpv.a'], check=True)
    shutil.copy2(base / 'build/obj-mpv/libmpv.a', base / 'build/prefix/lib/libmpv.a')
elif 'bool sub_next_raw_boundary(' not in (base / 'build/sources/mpv/sub/dec_sub.c').read_text():
    raise SystemExit('External mpv build root lacks the maintained subtitle timing adaptation')
out = repo / 'web/engine-subtitles'
objects = repo / 'build/subtitle-service'
for folder in [out, objects]:
    folder.mkdir(parents=True, exist_ok=True)
env = os.environ.copy()
env['EM_CONFIG'] = os.environ.get('EM_CONFIG', str(base / 'build/gap.emscripten') if (base / 'build/gap.emscripten').exists() else str(base / 'build/emsdk-4.0.14/.emscripten'))
env['PKG_CONFIG_LIBDIR'] = str(base / 'build/prefix/lib/pkgconfig')
env['PKG_CONFIG_PATH'] = env['PKG_CONFIG_LIBDIR']
commands = json.loads((base / 'build/obj-mpv/compile_commands.json').read_text())
client = next(entry for entry in commands if entry['file'].endswith('player/client.c'))
maps = [f'-ffile-prefix-map={repo}=/demuxe', f'-ffile-prefix-map={base}=/demuxe-build']
config = objects / 'normalized'
config.mkdir(exist_ok=True)
header = (base / 'build/obj-mpv/config.h').read_text().replace(str(base), '/demuxe-build').replace(str(repo), '/demuxe')
(config / 'config.h').write_text(header)

def compile_flags(entry):
    args = shlex.split(entry['command'])
    return [args[0], '-I' + str(config), *maps, *args[1:args.index('-MD')]]

libs = shlex.split(subprocess.check_output(['pkg-config', '--libs', '--cflags', '--static', 'mpv'], env=env, text=True))
# The ordinary mpv archive is paired with a minimal FFmpeg build that omits
# SubRip, mov_text, PGS and DVD bitmap decoders. Keep the subtitle service's
# codec expansion isolated from the A/V engines by linking the existing pinned
# full FFmpeg archives into this service only.
subtitle_ffmpeg = base / 'build/obj-software-full-ffmpeg'
components = (subtitle_ffmpeg / 'config_components.h').read_text()
for decoder in ['SUBRIP', 'MOVTEXT', 'ASS', 'SSA', 'PGSSUB', 'DVDSUB', 'WEBVTT']:
    if f'#define CONFIG_{decoder}_DECODER 1' not in components:
        raise SystemExit(f'Subtitle service FFmpeg lacks {decoder} decoder')
# FFmpeg 9's expanded decoder archive uses avutil helpers that the minimal
# baseline archive omits. Pair the full decoder with its matching avutil.
for library in ['avcodec', 'avutil']:
    archive = subtitle_ffmpeg / f'lib{library}' / f'lib{library}.a'
    if not archive.is_file():
        raise SystemExit(f'Missing subtitle service archive: {archive}')
    libs = [str(archive) if item == f'-l{library}' else item for item in libs]
dav1d_archive = base / 'build/obj-dav1d/src/libdav1d.a'
if not dav1d_archive.is_file():
    raise SystemExit(f'Missing subtitle service archive: {dav1d_archive}')
codec_archive = str(subtitle_ffmpeg / 'libavcodec/libavcodec.a')
libs.insert(libs.index(codec_archive)+1, str(dav1d_archive))
normalized_commands = []
extra = []
if base != repo:
    # An external cache may contain generated prefix strings and header __FILE__
    # literals from an older checkout. Normalize these before compilation.
    def compile_entry(entry):
        target = config / pathlib.Path(entry['output']).name
        args = [*compile_flags(entry), '-c', entry['file'], '-o', str(target)]
        subprocess.run(args, cwd=entry['directory'], env=env, check=True, stdout=subprocess.DEVNULL)
        return str(target), args
    entries = [entry for entry in commands if entry.get('output', '').startswith('libmpv.a.p/')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        compiled = list(pool.map(compile_entry, entries))
    archive = config / 'libmpv.a'
    compiler = pathlib.Path(shlex.split(client['command'])[0])
    subprocess.run([str(compiler.with_name('emar')), 'rcs', str(archive), *[item[0] for item in compiled]], env=env, check=True)
    normalized_commands.extend(item[1] for item in compiled)
    libs = [str(archive) if item == '-lmpv' else item for item in libs]
    # libxml's default catalog URL is a generated configuration literal. Provide
    # the same catalog implementation compiled with the stable virtual prefix.
    xml_dir = base / 'build/obj-libxml2'
    command = subprocess.check_output(['ninja', '-C', str(xml_dir), '-t', 'commands', 'CMakeFiles/LibXml2.dir/catalog.c.o'], text=True).strip().splitlines()[-1]
    args = shlex.split(command)
    args = args[:args.index('-MD')]
    args = ['-DSYSCONFDIR="/demuxe/etc"' if arg.startswith('-DSYSCONFDIR=') else arg for arg in args]
    catalog = config / 'catalog.o'
    args += [*maps, '-c', str(base / 'build/sources/libxml2/catalog.c'), '-o', str(catalog)]
    subprocess.run(args, cwd=xml_dir, env=env, check=True)
    extra.append(str(catalog))
    normalized_commands.append(args)
(objects / 'normalized-commands.json').write_text(json.dumps(normalized_commands, indent=2) + '\n')
args = [*compile_flags(client), '-I' + str(repo / 'native'), '-I' + str(base / 'build/sources/mpv'), '-c', str(repo / 'native/subtitles/service.c'), '-o', str(objects / 'bridge.o')]
subprocess.run(args, cwd=client['directory'], env=env, check=True)
args = [args[0], '-O2', '-pthread', '-msimd128', *maps, '-I' + str(config), '-I' + str(repo / 'native'), '-I' + str(base / 'build/sources/mpv'), '-I' + str(base / 'build/obj-mpv'), str(objects / 'bridge.o'), str(repo / 'native/subtitles/bitmap.c'), str(repo / 'native/stream_bridge.c'), *extra, *libs, '-lstdc++', '-fexceptions', '-sMODULARIZE=1', '-sEXPORT_ES6=1', '-sENVIRONMENT=worker', '-sPTHREAD_POOL_SIZE=4', '-sINITIAL_MEMORY=67108864', '-sMAXIMUM_MEMORY=134217728', '-sALLOW_MEMORY_GROWTH=1', '-sSTACK_SIZE=2097152', '-sDEFAULT_PTHREAD_STACK_SIZE=2097152', '-sWASM_BIGINT=1', '-sWASMFS=1', '-sFORCE_FILESYSTEM=1', '-sEXIT_RUNTIME=0', '-sEXPORTED_FUNCTIONS=["_malloc","_free"]', '-sEXPORTED_RUNTIME_METHODS=["ccall","FS","HEAPU8","HEAP32","UTF8ToString","PThread"]', '-o', str(out / 'service.mjs')]
(repo / 'build/link-maps').mkdir(exist_ok=True)
args.insert(args.index('-lstdc++'), '-Wl,-Map,' + str(repo / 'build/link-maps/subtitles.map'))
(objects / 'link-command.json').write_text(json.dumps(args, indent=2))
subprocess.run(args, cwd=base, env=env, check=True)
engine_js = out / 'service.mjs'
engine_js.write_text('// SPDX-License-Identifier: LGPL-2.1-or-later\n' + engine_js.read_text())
for name in ['service.mjs', 'service.wasm']:
    if re.search(rb'/(?:Users|Volumes|private/var)/', (out / name).read_bytes()):
        raise SystemExit('Build paths remain in subtitle engine: ' + name)
inputs = ['native/subtitles/service.c', 'native/subtitles/bitmap.c', 'native/stream_bridge.c', 'native/stream_bridge.h', 'scripts/build-subtitles.py', 'sources.lock.json', 'patches/0014-subtitle-raw-timing.patch', 'patches/0015-subtitle-static-profile.patch', 'patches/0016-subtitle-visual-schedule.patch', 'patches/0017-subtitle-ass-scan-budget.patch']
record = {'mpvBuildRoot': str(base), 'releaseQualified': False, 'maximumMemoryBytes': 134217728, 'initialMemoryBytes': 67108864, 'subtitleFFmpegConfigurationSHA256': hashlib.sha256(components.encode()).hexdigest(), 'subtitleFFmpegArchives': {'avcodec': hashlib.sha256((subtitle_ffmpeg / 'libavcodec/libavcodec.a').read_bytes()).hexdigest(), 'avutil': hashlib.sha256((subtitle_ffmpeg / 'libavutil/libavutil.a').read_bytes()).hexdigest(), 'dav1d': hashlib.sha256(dav1d_archive.read_bytes()).hexdigest()}, 'inputs': {name: hashlib.sha256((repo / name).read_bytes()).hexdigest() for name in inputs}, 'artifacts': {name: hashlib.sha256((out / name).read_bytes()).hexdigest() for name in ['service.mjs', 'service.wasm']}, 'normalizedConfigurationSHA256': hashlib.sha256(header.encode()).hexdigest()}
(objects / 'manifest.json').write_text(json.dumps(record, indent=2) + '\n')

#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exercise path portability from the actual recipes without building media code."""
import ast
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SDK = Path(os.environ.get('DEMUXE_SDK', ROOT / 'build/emsdk-4.0.14')).resolve()
RECIPES = ROOT / 'experiments/jspi-asyncify/mpv/scripts'


def expression(path, select, names):
    matches = [node for node in ast.walk(ast.parse(path.read_text())) if select(node)]
    if len(matches) != 1:
        raise RuntimeError(f'Recipe command changed; review portability probe: {path}')
    return eval(compile(ast.Expression(matches[0]), str(path), 'eval'), names)


with tempfile.TemporaryDirectory(prefix='demuxe-portability-') as directory:
    base = Path(directory).resolve()
    out = base / 'playback'
    inputs = out / 'inputs'
    inputs.mkdir(parents=True)
    source = inputs / 'filename.c'
    source.write_text('const char *source_filename = __FILE__;\n')
    link = RECIPES / 'link-playback.py'
    tree = ast.parse(link.read_text())
    assignments = [node for node in ast.walk(tree) if isinstance(node, ast.Assign)
                   and any(isinstance(t, ast.Name) and t.id == 'command' for t in node.targets)]
    if len(assignments) != 1:
        raise RuntimeError('Playback command changed; review portability probe')
    command = eval(compile(ast.Expression(assignments[0].value), str(link), 'eval'), {
        'sdk': SDK, 'flags': [], 'ROOT': ROOT, 'out': out, 'inputs': inputs,
        'sources': [source], 'libs': [], 'maximum_memory': 536870912,
        'exports': [], 'json': json,
    })
    maps = [str(arg) for arg in command if str(arg).startswith('-ffile-prefix-map=')]
    config = base / 'emscripten.config'
    config.write_text(f'LLVM_ROOT={str(SDK / "upstream/bin")!r}\n'
                      f'BINARYEN_ROOT={str(SDK / "upstream")!r}\n'
                      f'NODE_JS={shutil.which("node")!r}\n'
                      f'CACHE={str(base / "cache")!r}\n')
    env = {**os.environ, 'EM_CONFIG': str(config), 'EM_CACHE': str(base / 'cache'),
           'EMCC_CFLAGS': ''}
    env.pop('EMMAKEN_CFLAGS', None)

    def filename(flags):
        return subprocess.check_output([str(command[0]), *flags, '-E', '-P', str(source)],
                                       env=env, text=True)

    mapped, control = filename(maps), filename([])
    if str(base) in mapped or str(source) not in control:
        raise RuntimeError('Copied playback source embeds its host filename')

    dependencies = RECIPES / 'build-dependencies.py'
    configure = expression(dependencies, lambda node: isinstance(node, ast.List)
                           and any(isinstance(x, ast.Starred) and isinstance(x.value, ast.Name)
                                   and x.value.id == 'extra' for x in node.elts)
                           and any(isinstance(x, ast.Constant) and x.value == 'emcmake'
                                   for x in node.elts), {
        'str': str, 'src': base / 'source', 'obj': base / 'objects',
        'prefix': base / 'prefix', 'extra': [],
    })
    settings = [str(arg) for arg in configure if str(arg).startswith('-DCMAKE_INSTALL_')]
    cmake = ROOT / 'build/venv/bin/cmake'
    if not cmake.is_file():
        cmake = shutil.which('cmake')
    script = base / 'catalog.cmake'
    script.write_text('set(CMAKE_SYSTEM_NAME Linux)\nset(CMAKE_SIZEOF_VOID_P 4)\n'
                      'include(GNUInstallDirs)\n'
                      'file(WRITE "${REPORT}" "${CMAKE_INSTALL_FULL_SYSCONFDIR}/xml/catalog")\n')
    report = base / 'catalog.txt'

    def catalog(options):
        subprocess.run([str(cmake), *options, '-DREPORT=' + str(report), '-P', str(script)],
                       check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return report.read_text()

    configured = catalog(settings)
    control = catalog([arg for arg in settings if not arg.startswith('-DCMAKE_INSTALL_SYSCONFDIR=')])
    if str(base) in configured or str(base) not in control:
        raise RuntimeError('libxml2 catalog default embeds its host install prefix')
    print(json.dumps({
        'passed': True, 'scope': 'Prebuild filename and catalog configuration portability',
        'mappedFilename': mapped.strip(), 'catalog': configured,
        'negativeControlsDetected': 2,
        'recipes': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in [link, dependencies]},
    }, indent=2))

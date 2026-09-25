# SPDX-License-Identifier: Apache-2.0
"""Build a test-only snapshot bridge against the pinned subtitle-service objects."""
import json
import os
import pathlib
import shlex
import subprocess
import sys

repo = pathlib.Path(__file__).resolve().parents[2]
out = repo / 'results/subtitle-deadline-candidate/engine'
out.mkdir(parents=True, exist_ok=True)
client = next(x for x in json.loads((repo / 'build/obj-mpv/compile_commands.json').read_text()) if x['file'].endswith('player/client.c'))
args = shlex.split(client['command'])
compiler = args[0]
flags = ['-I' + str(repo / 'build/subtitle-service/normalized'), '-ffile-prefix-map=' + str(repo) + '=/demuxe', *args[1:args.index('-MD')]]
env = os.environ.copy()
emsdk = pathlib.Path(compiler).parents[2]
config = out / 'emscripten.config'
config.write_text('\n'.join([
    f"NODE_JS = {str(emsdk / 'node/22.16.0_64bit/bin/node')!r}",
    f"PYTHON = {sys.executable!r}",
    f"LLVM_ROOT = {str(emsdk / 'upstream/bin')!r}",
    f"BINARYEN_ROOT = {str(emsdk / 'upstream')!r}",
    f"EMSCRIPTEN_ROOT = {str(emsdk / 'upstream/emscripten')!r}",
]) + '\n')
env['EM_CONFIG'] = str(config)
env['EM_CACHE'] = str(out / 'em-cache')
obj = out / 'bridge.o'
subprocess.run([compiler, *flags, '-I' + str(repo / 'native'), '-I' + str(repo / 'build/sources/mpv'), '-c', str(repo / 'experiments/subtitle-deadline-candidate/bridge.c'), '-o', str(obj)], cwd=client['directory'], env=env, check=True)
link = json.loads((repo / 'build/subtitle-service/link-command.json').read_text())
link = [str(obj) if x == str(repo / 'build/subtitle-service/bridge.o') else x for x in link]
link[link.index('-o') + 1] = str(out / 'service.mjs')
link = [('-Wl,-Map,' + str(out / 'subtitles.map')) if x.startswith('-Wl,-Map,') else x for x in link]
subprocess.run(link, cwd=repo, env=env, check=True)
print(out)

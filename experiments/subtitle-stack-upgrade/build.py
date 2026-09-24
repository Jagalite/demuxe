# SPDX-License-Identifier: Apache-2.0
"""Link the existing test-only sub-lines bridge against the upgraded service."""
import json
import os
import pathlib
import shlex
import subprocess

repo = pathlib.Path(__file__).resolve().parents[2]
out = repo / 'results/subtitle-stack-upgrade/engine'
out.mkdir(parents=True, exist_ok=True)
client = next(x for x in json.loads((repo / 'build/obj-mpv/compile_commands.json').read_text()) if x['file'].endswith('player/client.c'))
args = shlex.split(client['command'])
compiler = args[0]
flags = ['-I' + str(repo / 'build/subtitle-service/normalized'), '-ffile-prefix-map=' + str(repo) + '=/demuxe', *args[1:args.index('-MD')]]
env = os.environ.copy()
env['EM_CONFIG'] = str(repo / 'build/beta.emscripten')
env['EM_CACHE'] = str(repo / 'build/cache')
obj = out / 'bridge.o'
source = repo / 'experiments/subtitle-stack-upgrade/bridge.c'
subprocess.run([compiler, *flags, '-I' + str(repo / 'native'), '-I' + str(repo / 'build/sources/mpv'), '-c', str(source), '-o', str(obj)], cwd=client['directory'], env=env, check=True)
link = json.loads((repo / 'build/subtitle-service/link-command.json').read_text())
link = [str(obj) if x == str(repo / 'build/subtitle-service/bridge.o') else x for x in link]
link[link.index('-o') + 1] = str(out / 'service.mjs')
link = [('-Wl,-Map,' + str(out / 'subtitles.map')) if x.startswith('-Wl,-Map,') else x for x in link]
subprocess.run(link, cwd=repo, env=env, check=True)
print(out)

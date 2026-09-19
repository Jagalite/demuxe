#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Real native packet/decoder transition probe; not mpv playback qualification."""
import argparse
import hashlib
import json
import os
import shlex
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--native', type=Path, required=True)
p.add_argument('--fixtures', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--fixed', action='store_true', help='Control workload without representation changes')
p.add_argument('--continuous-fmp4', action='store_true', help='Experimental native DASH continuous-container option')
p.add_argument('--candidate-delay', type=float, default=0, help='Delay the first selected high-rendition segment, in seconds')
a = p.parse_args()
native, fixtures, out = a.native.resolve(), a.fixtures.resolve(), a.output.resolve()
here = Path(__file__).resolve().parent
if out.exists():
    raise SystemExit('Use a new evidence directory')
out.mkdir(parents=True)
sources = [here / 'native' / n for n in ['transition.c', 'packet-playback-probe.c']]
libraries = [native / 'build' / lib / (lib + '.a') for lib in ['libavformat', 'libavcodec', 'libswresample', 'libavutil']]
command = ['cc', '-O1', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer',
           '-I' + str(native / 'source'), '-I' + str(native / 'build'), *map(str, sources),
           *map(str, libraries), *shlex.split(subprocess.check_output(['pkg-config', '--libs', 'libxml-2.0'], text=True)),
           '-lm', '-lpthread', '-o', str(out / 'probe')]
with (out / 'compile.log').open('w') as log:
    subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True)
traffic = []

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        name = self.path.lstrip('/')
        file = (fixtures / name).resolve()
        if not file.is_relative_to(fixtures) or not file.is_file():
            self.send_error(404)
            return
        data = file.read_bytes()
        r = {'file': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'at': time.monotonic()}
        traffic.append(r)
        if a.candidate_delay and name in ['high/002.m4s', 'dash/chunk-stream2-00003.m4s']:
            r['injectedDelaySeconds'] = a.candidate_delay
            time.sleep(a.candidate_delay)
        self.send_response(200)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            r['cancelled'] = True

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
record = {'scope': __doc__, 'releaseQualified': False, 'nativeBuild': json.loads((native / 'build-record.json').read_text()),
          'command': command, 'inputs': {str(f): hashlib.sha256(f.read_bytes()).hexdigest() for f in [Path(__file__), here / 'native/transition.h', *sources, *libraries]},
          'probeSHA256': hashlib.sha256((out / 'probe').read_bytes()).hexdigest(), 'cases': []}
try:
    for name, manifest in [('hls', 'master.m3u8'), ('dash', 'dash/manifest.mpd')]:
        traffic.clear()
        command = [str(out / 'probe'), f'http://127.0.0.1:{server.server_port}/{manifest}']
        if a.fixed:
            command.append('--fixed')
        env = dict(os.environ)
        env.pop('DEMUXE_PROBE_CONTINUOUS_FMP4', None)
        if a.continuous_fmp4:
            env['DEMUXE_PROBE_CONTINUOUS_FMP4'] = '1'
        result = subprocess.run(command, env=env, capture_output=True, timeout=90)
        (out / (name + '.log')).write_bytes(result.stderr)
        (out / (name + '.jsonl')).write_bytes(result.stdout)
        events = [json.loads(line) for line in result.stdout.decode().splitlines()]
        case = {'format': name, 'command': command, 'continuousFmp4': a.continuous_fmp4, 'candidateDelaySeconds': a.candidate_delay, 'exit': result.returncode, 'events': events, 'requests': list(traffic),
                'passed': result.returncode == 0 and bool(events) and events[-1].get('passed', False)}
        record['cases'].append(case)
        print(name, 'passed', case['passed'], events[-1] if events else 'no events', flush=True)
finally:
    server.shutdown()
    server.server_close()
    thread.join()
    record['passed'] = len(record['cases']) == 2 and all(c['passed'] for c in record['cases'])
    (out / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
raise SystemExit(0 if record['passed'] else 1)

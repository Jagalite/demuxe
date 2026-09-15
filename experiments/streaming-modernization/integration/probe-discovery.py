#!/usr/bin/env python3
"""Measure native FFmpeg full-manifest discovery and unselected media traffic."""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import subprocess
import threading
import time
from urllib.parse import unquote, urlsplit

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--native', type=Path, required=True)
p.add_argument('--fixtures', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--sparse', action='store_true')
p.add_argument('--init-mode', choices=['normal', 'unknown', 'oversized', 'oversized-unknown', 'truncated', 'no-terminal-chunk', 'short-chunk'], default='normal')
p.add_argument('--trace', action='store_true')
a = p.parse_args()
out, fixtures, native = a.output.resolve(), a.fixtures.resolve(), a.native.resolve()
out.mkdir()
sha = lambda b: hashlib.sha256(b).hexdigest()
requests = []


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *_):
        pass

    def do_GET(self):
        name = unquote(urlsplit(self.path).path).lstrip('/')
        file = (fixtures / name).resolve()
        entry = {'resource': name, 'at': time.monotonic(), 'bytes': 0}
        requests.append(entry)
        if not file.is_relative_to(fixtures) or not file.is_file():
            self.send_error(404)
            return
        data = file.read_bytes()
        altered = name in ['high/init.mp4', 'dash/init-stream2.m4s'] and a.init_mode != 'normal'
        if altered and a.init_mode.startswith('oversized'):
            # Valid trailing free box: accepting only the original moov would
            # conceal the input-limit violation while preserving decodable data.
            size = 1024 * 1024 + 8
            data += size.to_bytes(4, 'big') + b'free' + bytes(size-8)
        if altered:
            entry['responseMode'] = a.init_mode
            entry['responseSHA256'] = sha(data)
        match = re.fullmatch(r'bytes=(\d+)-(\d*)', self.headers.get('Range', ''))
        unknown = altered and a.init_mode in ['unknown', 'oversized-unknown', 'no-terminal-chunk', 'short-chunk']
        if unknown:
            match = None
        start = int(match[1]) if match else 0
        end = min(len(data), int(match[2]) + 1) if match and match[2] else len(data)
        if start >= end:
            self.send_error(416)
            return
        self.send_response(206 if match else 200)
        if match:
            extra = 32 if altered and a.init_mode == 'truncated' else 0
            self.send_header('Content-Range', f'bytes {start}-{end-1+extra}/{len(data)+extra}')
        if unknown:
            self.send_header('Transfer-Encoding', 'chunked')
        else:
            self.send_header('Content-Length', str(end-start + (32 if altered and a.init_mode == 'truncated' else 0)))
            self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Connection', 'close')
        self.close_connection = True
        self.end_headers()
        try:
            if unknown:
                if a.init_mode == 'short-chunk':
                    self.wfile.write(f'{end-start+32:x}\r\n'.encode()+data[start:end])
                else:
                    for at in range(start, end, 16384):
                        chunk = data[at:min(at+16384, end)]
                        self.wfile.write(f'{len(chunk):x}\r\n'.encode()+chunk+b'\r\n')
                    if a.init_mode != 'no-terminal-chunk':
                        self.wfile.write(b'0\r\n\r\n')
            else:
                self.wfile.write(data[start:end])
            entry['bytes'] = end-start
        except (BrokenPipeError, ConnectionResetError):
            entry['clientClosed'] = True


server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever)
thread.start()
result = {'scope': __doc__, 'releaseQualified': False, 'sparse': a.sparse,
          'initializationResponse': a.init_mode,
          'harnessSHA256': sha(Path(__file__).read_bytes()),
          'ffprobeSHA256': sha((native/'build/ffprobe').read_bytes()),
          'build': json.loads((native/'build-record.json').read_text()),
          'fixture': json.loads((fixtures/'fixture-manifest.json').read_text()), 'cases': []}
try:
    for kind, manifest in [('hls', 'master.m3u8'), ('dash', 'dash/manifest.mpd')]:
        requests.clear()
        command = [str(native/'build/ffprobe'), '-v', 'trace' if a.trace else 'warning', '-strict_io', '1']
        if kind == 'dash':
            command += ['-continuous_fmp4', '1']
        if a.sparse:
            command += ['-demuxe_sparse', '1']
        command += ['-analyzeduration', '2000000', '-probesize', '500000',
                    '-read_intervals', '%+1', '-show_streams', '-show_packets', '-of', 'json',
                    f'http://127.0.0.1:{server.server_port}/{manifest}']
        process = subprocess.run(command, capture_output=True, timeout=40)
        (out/(kind+'.json')).write_bytes(process.stdout)
        (out/(kind+'.log')).write_bytes(process.stderr)
        case = {'format': kind, 'command': command, 'exit': process.returncode,
                'requests': list(requests), 'passed': False}
        result['cases'].append(case)
        try:
            if a.init_mode in ['oversized', 'oversized-unknown', 'truncated', 'no-terminal-chunk', 'short-chunk']:
                assert any(r.get('responseMode') == a.init_mode for r in requests)
                assert process.returncode != 0, 'Incomplete initialization was accepted'
                case['passed'] = True
                continue
            assert process.returncode == 0, process.stderr.decode()
            data = json.loads(process.stdout)
            videos = [s for s in data['streams'] if s['codec_type'] == 'video']
            assert sorted(s['width'] for s in videos) == [320, 640, 960]
            assert all(s.get('extradata_size', 0) > 0 for s in videos)
            packets = [p for p in data['packets'] if p['codec_type'] == 'video']
            assert packets, 'Selected video did not produce packets'
            unselected = [r for r in requests if re.match(r'^(medium|high)/\d+\.m4s$|^dash/chunk-stream[12]-', r['resource'])]
            case['unselectedSegmentRequests'] = len(unselected)
            case['unselectedSegmentBytes'] = sum(r['bytes'] for r in unselected)
            case['totalRequests'] = len(requests)
            case['totalBytes'] = sum(r['bytes'] for r in requests)
            case['videoPackets'] = len(packets)
            if a.sparse:
                assert not unselected, 'Unselected media was fetched during discovery'
                assert len({p['stream_index'] for p in packets}) == 1
            else:
                assert unselected, 'Baseline no longer reproduces eager rendition reads'
            case['passed'] = True
        except Exception as e:
            case['error'] = str(e)
finally:
    server.shutdown()
    thread.join()
    server.server_close()
    result['passed'] = len(result['cases']) == 2 and all(c['passed'] for c in result['cases'])
    (out/'result.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({'passed': result['passed'], 'cases': [{k: v for k, v in c.items() if k not in ['requests', 'command']} for c in result['cases']]}))
raise SystemExit(0 if result['passed'] else 1)

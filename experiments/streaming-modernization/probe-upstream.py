#!/usr/bin/env python3
"""Characterize unadapted manifests with a pinned native ffprobe, not browser playback."""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import re
from pathlib import Path
import subprocess
import threading
import time
import datetime
import xml.etree.ElementTree as ET
from urllib.parse import unquote, urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ffprobe', required=True, type=Path)
parser.add_argument('--fixtures', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--switch-probe', type=Path, help='Optional native discard-switch characterization binary')
parser.add_argument('--live', action='store_true', help='Also characterize rolling manifests and live seek')
args = parser.parse_args()
fixtures = args.fixtures.resolve()
out = args.output.resolve()
if out.exists():
    raise SystemExit('Use a new output directory to preserve previous evidence')
out.mkdir(parents=True)
requests = []
lock = threading.Lock()
live_started = time.time() - 8
live_active = False

def live_manifest(name):
    global live_started
    if name not in ['live-hls.m3u8', 'live-dash.mpd']:
        return None
    edge = min(12, int((time.time() - live_started) // 2))
    start = max(0, edge - 4)
    if name == 'live-hls.m3u8':
        lines = ['#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-TARGETDURATION:2',
                 f'#EXT-X-MEDIA-SEQUENCE:{start}', '#EXT-X-MAP:URI="low/init.mp4"']
        for index in range(start, edge):
            lines += ['#EXTINF:2,', f'low/{index:03d}.m4s']
        return ('\n'.join(lines) + '\n').encode()
    ns = '{urn:mpeg:dash:schema:mpd:2011}'
    ET.register_namespace('', ns[1:-1])
    mpd = ET.parse(fixtures / 'dash/manifest.mpd').getroot()
    mpd.attrib.pop('mediaPresentationDuration', None)
    def utc(timestamp):
        return datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    mpd.attrib.update(type='dynamic', availabilityStartTime=utc(live_started), publishTime=utc(time.time()),
                      minimumUpdatePeriod='PT1S', timeShiftBufferDepth='PT8S', suggestedPresentationDelay='PT4S')
    base = ET.Element(ns + 'BaseURL')
    base.text = 'dash/'
    mpd.insert(0, base)
    for period in mpd.findall(ns + 'Period'):
        for adaptation in list(period.findall(ns + 'AdaptationSet')):
            if adaptation.get('contentType') != 'video':
                period.remove(adaptation)
    for template in mpd.iter(ns + 'SegmentTemplate'):
        for timeline in list(template):
            template.remove(timeline)
        template.set('duration', str(int(template.get('timescale')) * 2))
    return ET.tostring(mpd, encoding='utf-8', xml_declaration=True)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        name = unquote(urlsplit(self.path).path).lstrip('/')
        file = (fixtures / name).resolve()
        record = {'resource': name, 'at': time.monotonic(), 'bytes': 0, 'range': self.headers.get('Range')}
        with lock:
            requests.append(record)
        virtual = live_manifest(name) if args.live else None
        if virtual is not None:
            record['manifestSHA256'] = hashlib.sha256(virtual).hexdigest()
            (out / (record['manifestSHA256'] + '.manifest')).write_bytes(virtual)
            record['status'] = 200
            self.send_response(200)
            self.send_header('Content-Length', str(len(virtual)))
            self.end_headers()
            try:
                self.wfile.write(virtual)
                record['bytes'] = len(virtual)
            except (BrokenPipeError, ConnectionResetError):
                record['clientClosed'] = True
            return
        if not file.is_relative_to(fixtures) or not file.is_file():
            record['status'] = 404
            self.send_error(404)
            return
        if live_active:
            hls_segment = re.fullmatch(r'low/(\d+)\.m4s', name)
            dash_segment = re.fullmatch(r'dash/chunk-stream\d+-(\d+)\.m4s', name)
            index = int(hls_segment[1]) if hls_segment else int(dash_segment[1]) - 1 if dash_segment else None
            edge = min(12, int((time.time() - live_started) // 2))
            if index is not None and not max(0, edge - 4) <= index < edge:
                record['status'] = 410 if index < edge else 503
                self.send_error(record['status'])
                return
        size = file.stat().st_size
        start, end = 0, size - 1
        if record['range']:
            match = re.fullmatch(r'bytes=(\d+)-(\d*)', record['range'])
            if not match:
                record['status'] = 416
                self.send_error(416)
                return
            start = int(match[1])
            end = min(end, int(match[2])) if match[2] else end
        if start > end:
            record['status'] = 416
            self.send_error(416)
            return
        record['status'] = 206 if record['range'] else 200
        self.send_response(record['status'])
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Type', 'application/octet-stream')
        if record['range']:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        try:
            with file.open('rb') as stream:
                stream.seek(start)
                remaining = end - start + 1
                while remaining:
                    data = stream.read(min(65536, remaining))
                    if not data:
                        break
                    self.wfile.write(data)
                    record['bytes'] += len(data)
                    remaining -= len(data)
        except (BrokenPipeError, ConnectionResetError):
            record['clientClosed'] = True

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
results = []
try:
    cases = [('hls-master', 'master.m3u8', '2'),
                                      ('dash-ladder', 'dash/manifest.mpd', '2'),
                                      ('dash-periods', 'periods.mpd', None)]
    if args.live:
        cases += [('hls-live', 'live-hls.m3u8', '8'), ('dash-live', 'live-dash.mpd', '8')]
    for name, resource, interval in cases:
        live_started = time.time() - 8
        live_active = 'live' in name
        with lock:
            requests.clear()
        command = [str(args.ffprobe.resolve()), '-v', 'warning', '-strict', 'experimental',
                   '-extension_picky', '0', '-show_streams', '-show_format', '-show_packets',
                   '-of', 'json']
        if interval:
            command += ['-read_intervals', '%+' + interval]
        command += [f'http://127.0.0.1:{server.server_port}/{resource}']
        began = time.monotonic()
        try:
            process = subprocess.run(command, capture_output=True, timeout=45)
            stdout, stderr, code = process.stdout, process.stderr, process.returncode
        except subprocess.TimeoutExpired as error:
            stdout, stderr, code = error.stdout or b'', error.stderr or b'', None
        (out / (name + '.json')).write_bytes(stdout)
        (out / (name + '.log')).write_bytes(stderr)
        try:
            data = json.loads(stdout)
        except json.JSONDecodeError:
            data = {}
        packets = data.get('packets', [])
        times = [float(p['pts_time']) for p in packets if 'pts_time' in p]
        with lock:
            traffic = [dict(r) for r in requests]
        results.append({'case': name, 'exit': code, 'seconds': time.monotonic() - began,
                        'command': command, 'streamCount': len(data.get('streams', [])),
                        'packetCount': len(packets), 'firstPTS': min(times) if times else None,
                        'lastPTS': max(times) if times else None, 'traffic': traffic})
    if args.switch_probe:
        switch_cases = [('hls-switch', 'master.m3u8', []), ('dash-switch', 'dash/manifest.mpd', [])]
        if args.live:
            switch_cases += [('hls-live-seek', 'live-hls.m3u8', ['--seek']), ('dash-live-seek', 'live-dash.mpd', ['--seek'])]
        for name, resource, extra in switch_cases:
            live_started = time.time() - 8
            live_active = 'live' in name
            with lock:
                requests.clear()
            command = [str(args.switch_probe.resolve()), f'http://127.0.0.1:{server.server_port}/{resource}', *extra]
            try:
                process = subprocess.run(command, capture_output=True, timeout=45)
                stdout, stderr, code = process.stdout, process.stderr, process.returncode
            except subprocess.TimeoutExpired as error:
                stdout, stderr, code = error.stdout or b'', error.stderr or b'', None
            (out / (name + '.jsonl')).write_bytes(stdout)
            (out / (name + '.log')).write_bytes(stderr)
            with lock:
                traffic = [dict(r) for r in requests]
            results.append({'case': name, 'exit': code, 'command': command,
                            'events': [json.loads(row) for row in stdout.splitlines()], 'traffic': traffic})
finally:
    server.shutdown()
    server.server_close()
    thread.join()
record = {'scope': 'native upstream demux characterization; not browser playback or ABR',
          'version': subprocess.check_output([str(args.ffprobe.resolve()), '-version'], text=True),
          'binarySHA256': hashlib.sha256(args.ffprobe.read_bytes()).hexdigest(),
          'fixtureManifestSHA256': hashlib.sha256((fixtures / 'fixture-manifest.json').read_bytes()).hexdigest(),
          'switchProbeSHA256': hashlib.sha256(args.switch_probe.read_bytes()).hexdigest() if args.switch_probe else None,
          'cases': results}
(out / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
for case in results:
    print(case['case'], 'exit', case['exit'], 'streams', case.get('streamCount'),
          'packets', case.get('packetCount'), 'last PTS', case.get('lastPTS'),
          'requests', len(case['traffic']))

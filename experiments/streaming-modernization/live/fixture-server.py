#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Serve recorded finite bytes through controlled standard rolling HLS/DASH windows.

This is a test origin, not a playback adapter. Every served manifest and request
is retained. The server models availability; only the player owns playback.
"""
import argparse, datetime, hashlib, json, re, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

NS='{urn:mpeg:dash:schema:mpd:2011}'
ET.register_namespace('',NS[1:-1])

def utc(seconds):
    return datetime.datetime.fromtimestamp(seconds,datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')

def hls_media(text, first, edge):
    entries=[];duration=None;init=None
    for line in text.splitlines():
        if line.startswith('#EXT-X-MAP:'):init=line
        elif line.startswith('#EXTINF:'):duration=line
        elif line and not line.startswith('#') and duration:
            entries.append((duration,line));duration=None
    assert init and 0<=first<edge<=len(entries)
    # Original fixture media timestamps remain unchanged. Sequence numbers are
    # absolute fixture positions, even as the advertised window moves.
    lines=['#EXTM3U','#EXT-X-VERSION:7','#EXT-X-TARGETDURATION:3',f'#EXT-X-MEDIA-SEQUENCE:{first}',init]
    for pair in entries[first:edge]:lines.extend(pair)
    return ('\n'.join(lines)+'\n').encode()

def dash_media(data,first,edge,started,now,window_seconds):
    root=ET.fromstring(data);root.attrib.pop('mediaPresentationDuration',None)
    root.attrib.update(type='dynamic',availabilityStartTime=utc(started),publishTime=utc(now),minimumUpdatePeriod='PT1S',timeShiftBufferDepth=f'PT{window_seconds}S',suggestedPresentationDelay='PT6S')
    for period in root.findall(NS+'Period'):period.attrib.pop('duration',None)
    for template in root.iter(NS+'SegmentTemplate'):
        timeline=template.find(NS+'SegmentTimeline');assert timeline is not None
        entries=[];at=0
        for item in timeline:
            at=int(item.get('t',at));duration=int(item.attrib['d']);repeat=int(item.get('r','0'))
            assert duration>0 and 0<=repeat<10000
            for _ in range(repeat+1):entries.append((at,duration));at+=duration
        assert edge<=len(entries)
        original=int(template.get('startNumber','1'));template.set('startNumber',str(original+first))
        timeline.clear()
        for at,duration in entries[first:edge]:ET.SubElement(timeline,NS+'S',t=str(at),d=str(duration))
    return ET.tostring(root,encoding='utf-8',xml_declaration=True)

class FixtureOrigin:
    def __init__(self, fixtures, output, *, initial_seconds=24, window_seconds=16):
        self.fixtures=Path(fixtures).resolve();self.output=Path(output).resolve()
        self.output.mkdir();self.started=time.time()-initial_seconds;self.window_seconds=window_seconds
        self.fixture=json.loads((self.fixtures/'fixture-manifest.json').read_text())
        assert self.fixture['segmentSeconds']==2 and self.fixture['durationSeconds']>=120
        self.requests=[];self.lock=threading.Lock();self.offset=0
    def window(self):
        edge=min(self.fixture['durationSeconds']//2,int((time.time()+self.offset-self.started)//2))
        return max(0,edge-self.window_seconds//2),edge
    def body(self,name):
        first,edge=self.window()
        if name=='captions.m3u8':
            lines=['#EXTM3U','#EXT-X-VERSION:7','#EXT-X-TARGETDURATION:2',f'#EXT-X-MEDIA-SEQUENCE:{first}']
            for index in range(first,edge):lines += ['#EXTINF:2,',f'captions/{index:03d}.vtt']
            data=('\n'.join(lines)+'\n').encode()
            (self.output/(hashlib.sha256(data).hexdigest()+'.manifest')).write_bytes(data)
            return 200,data,True
        caption=re.fullmatch(r'captions/(\d+)\.vtt',name)
        if caption:
            index=int(caption[1])
            if not first<=index<edge:return (410 if index<first else 503),b'',False
            def stamp(seconds):
                hours=int(seconds//3600);minutes=int(seconds//60)%60;seconds%=60
                return f'{hours:02}:{minutes:02}:{seconds:06.3f}'
            data=f'WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:0\n\n{index}\n{stamp(index*2+.25)} --> {stamp(index*2+1.75)}\nLive cue {index}\n'
            return 200,data.encode(),False
        file=(self.fixtures/name).resolve()
        if not file.is_relative_to(self.fixtures) or not file.is_file():return 404,b'',False
        data=file.read_bytes();manifest=False
        if name.endswith('.m3u8') and '#EXTINF:' in data.decode():
            data=hls_media(data.decode(),first,edge);manifest=True
        elif name=='dash/manifest.mpd':
            data=dash_media(data,first,edge,self.started,time.time()+self.offset,self.window_seconds);manifest=True
        else:
            hls=re.fullmatch(r'(?:low|medium|high|english|alternate)/([0-9]+)\.m4s',name)
            dash=re.fullmatch(r'dash/chunk-stream\d+-([0-9]+)\.m4s',name)
            index=int(hls[1]) if hls else int(dash[1])-1 if dash else None
            if index is not None and not first<=index<edge:return (410 if index<first else 503),b'',False
        if manifest:
            digest=hashlib.sha256(data).hexdigest();(self.output/(digest+'.manifest')).write_bytes(data)
        return 200,data,manifest
    def flush(self):
        # Evidence writes must never hold the response-path lock. Slow external
        # disk writes would otherwise masquerade as browser/native I/O stalls.
        with self.lock:requests=[dict(r) for r in self.requests]
        (self.output/'requests.json').write_text(json.dumps(requests,indent=2)+'\n')
    def handler(self):
        origin=self
        class Handler(BaseHTTPRequestHandler):
            protocol_version='HTTP/1.1'
            def log_message(self,*_):pass
            def handle(self):
                try:super().handle()
                except ConnectionResetError:pass
            def do_GET(self):
                name=unquote(urlsplit(self.path).path).lstrip('/')
                status,data,mutable=origin.body(name);start,end=0,len(data)
                record={'name':name,'at':time.monotonic(),'window':origin.window(),'status':status,'mutable':mutable,'bytes':0,'sha256':hashlib.sha256(data).hexdigest()}
                if status==200 and not mutable and 'Range' in self.headers:
                    match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers['Range'])
                    if not match:status=416;data=b'';end=0
                    else:
                        start,end=int(match[1]),min(len(data),int(match[2])+1) if match[2] else len(data)
                        if not 0<=start<end<=len(data):status=416;data=b'';start=end=0
                        else:status=206
                record['status']=status
                with origin.lock:origin.requests.append(record)
                self.send_response(status);self.send_header('Content-Length',str(end-start));self.send_header('Cache-Control','no-store');self.send_header('Timing-Allow-Origin','*')
                if status in (200,206):self.send_header('ETag','"'+record['sha256']+'"');self.send_header('Accept-Ranges','bytes')
                if status==206:self.send_header('Content-Range',f'bytes {start}-{end-1}/{len(data)}')
                self.end_headers()
                try:self.wfile.write(data[start:end]);record['bytes']=end-start
                except (BrokenPipeError,ConnectionResetError):record['clientClosed']=True

        return Handler

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixtures',required=True,type=Path);p.add_argument('--output',required=True,type=Path);p.add_argument('--port',type=int,default=0);a=p.parse_args()
    origin=FixtureOrigin(a.fixtures,a.output);server=ThreadingHTTPServer(('127.0.0.1',a.port),origin.handler())
    (a.output/'origin.json').write_text(json.dumps({'url':f'http://127.0.0.1:{server.server_port}','started':origin.started,'windowSeconds':origin.window_seconds,'fixture':origin.fixture,'generatorSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2)+'\n')
    print(f'http://127.0.0.1:{server.server_port}',flush=True)
    try:server.serve_forever()
    finally:server.server_close();origin.flush()
if __name__=='__main__':main()

#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Real native HTTP truncation, comparing strict and legacy demux error handling."""
import argparse, hashlib, json, os, shlex, subprocess, threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import xml.etree.ElementTree as ET
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--native',type=Path,required=True);p.add_argument('--fixtures',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
p.add_argument('--fault',choices=['media','init'],default='media')
a=p.parse_args();native=a.native.resolve();fixtures=a.fixtures.resolve();out=a.output.resolve();here=Path(__file__).resolve().parent
if out.exists():raise SystemExit('Use a new evidence directory')
out.mkdir(parents=True);source=native/'source';build=native/'build'
libs=shlex.split(subprocess.check_output(['pkg-config','--libs','libxml-2.0'],text=True))
command=['cc','-O2','-I'+str(source),'-I'+str(build),str(here/'resource-error-probe.c'),*[str(build/n/(n+'.a')) for n in ['libavformat','libavcodec','libswresample','libavutil']],*libs,'-lm','-lpthread','-o',str(out/'probe')]
with (out/'compile.log').open('w') as log:subprocess.run(command,stdout=log,stderr=subprocess.STDOUT,check=True)
ns='{urn:mpeg:dash:schema:mpd:2011}';ET.register_namespace('',ns[1:-1]);mpd=ET.parse(fixtures/'dash/manifest.mpd').getroot()
period=mpd.find(ns+'Period')
for adaptation in list(period):
 if adaptation.tag!=ns+'AdaptationSet':continue
 if adaptation.get('contentType')!='video':period.remove(adaptation);continue
 for rep in list(adaptation.findall(ns+'Representation'))[1:]:adaptation.remove(rep)
manifest=ET.tostring(mpd,encoding='utf-8',xml_declaration=True);(out/'single-video.mpd').write_bytes(manifest)
traffic=[];fault_used=False
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  global fault_used
  name=self.path.lstrip('/');f=(fixtures/name).resolve()
  record={'file':name,'sent':0};traffic.append(record)
  if not f.is_relative_to(fixtures):self.send_error(403);return
  data=manifest if name=='dash/single.mpd' else f.read_bytes() if f.is_file() else None
  if data is None:self.send_error(404);return
  targets=['low/002.m4s','dash/chunk-stream0-00003.m4s'] if a.fault=='media' else ['low/init.mp4','dash/init-stream0.m4s']
  bad=not fault_used and name in targets
  if bad:fault_used=True
  declared=len(data)+(100000 if bad and a.fault=='init' else 0)
  record['truncated']=bad;record['declared']=declared
  self.send_response(200);self.send_header('Content-Length',str(declared));self.send_header('Connection','close');self.end_headers()
  try:
   sending=data[:max(1,len(data)//2)] if bad and a.fault=='media' else data
   self.wfile.write(sending);record['sent']=len(sending)
  except (BrokenPipeError,ConnectionResetError):record['closed']=True
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
record={'scope':'Native FFmpeg HTTP truncation with explicit strict_io option; no browser playback claim','fault':a.fault,'nativeBuild':json.loads((native/'build-record.json').read_text()),'probeSHA256':hashlib.sha256((out/'probe').read_bytes()).hexdigest(),'harnessSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'cases':[]}
try:
 for format,url in [('hls','low/media.m3u8'),('dash','dash/single.mpd')]:
  for strict in [0,1]:
   traffic.clear();fault_used=False;command=[str(out/'probe'),f'http://127.0.0.1:{server.server_port}/{url}',str(strict)]
   result=subprocess.run(command,capture_output=True,timeout=30)
   name=f'{format}-{strict}';(out/(name+'.log')).write_bytes(result.stderr);(out/(name+'.json')).write_bytes(result.stdout)
   data=json.loads(result.stdout);case={'format':format,'strict':strict,'exit':result.returncode,'command':command,'result':data,'requests':list(traffic)}
   case['passed']=data['stage']=='read' and result.returncode==0 and any(r.get('truncated') for r in traffic) and (not data['eof'] and data['result']<0 if strict else data['eof'])
   if strict and a.fault=='media':
    # A failed third segment must not silently advance to segment four.
    case['passed'] &= data['seekResult']>=0 and data['recoveredPTS']>8
   if strict and a.fault=='init':
    case['passed']=result.returncode==0 and data['result']<0 and not data['eof'] and data.get('packets',0)==0 and any(r.get('truncated') for r in traffic)
   record['cases'].append(case);print(name,data,'passed',case['passed'],flush=True)
finally:
 server.shutdown();server.server_close();thread.join();record['passed']=len(record['cases'])==4 and all(c['passed'] for c in record['cases']);(out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
raise SystemExit(0 if record['passed'] else 1)

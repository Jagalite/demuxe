#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Sanitized source-bound native terminal-error control; no browser playback claim."""
import argparse,hashlib,json,runpy,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for name in ['source','native','output']:p.add_argument('--'+name,required=True,type=Path)
p.add_argument('--startup-baseline',action='store_true',help='Negative regression check against the unpatched startup function')
a=p.parse_args();out=a.output.resolve();out.mkdir();here=Path(__file__).resolve().parent
sys.argv=['make-mpv-live-patch.py','--timeline','--source',str(a.source.resolve()),'--output',str(out/'generated.patch')]
data=runpy.run_path(str(here.parent/'make-mpv-live-patch.py'))
inputs={}
for name in ['demux/session-control.c','demux/session-control.h','common/demuxe-quality.h']:
 f=out/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(data['changes'][name][1]);inputs[name]=hashlib.sha256(f.read_bytes()).hexdigest()
for name in ['adaptive-session.h','container-task.h','webvtt-map.h']:
 f=here.parent/'subtitles/task'/name;(out/'demux'/name).write_bytes(f.read_bytes());inputs[str(f)]=hashlib.sha256(f.read_bytes()).hexdigest()
probe=here/'control-error-probe.c';(out/probe.name).write_bytes(probe.read_bytes());inputs[str(probe)]=hashlib.sha256(probe.read_bytes()).hexdigest()
cmd=['cc','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+str(out),'-I'+str(a.native.resolve()/'source'),'-I'+str(a.native.resolve()/'build'),str(probe),str(out/'demux/session-control.c'),'-lpthread','-o',str(out/'probe')]
with (out/'compile.log').open('w') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
with (out/'test.log').open('w') as log:r=subprocess.run([str(out/'probe')],stdout=log,stderr=subprocess.STDOUT,timeout=15)
loadfile=data['changes']['player/loadfile.c'][0 if a.startup_baseline else 1]
function=loadfile.split('void reselect_demux_stream(',1)[1].split('\nstatic void enable_demux_thread',1)[0]
(out/'track-refresh-function.c').write_text('void reselect_demux_stream('+function)
probe=here/'track-startup-probe.c';(out/probe.name).write_bytes(probe.read_bytes());inputs[str(probe)]=hashlib.sha256(probe.read_bytes()).hexdigest()
startup_cmd=['cc','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+str(out),str(probe),'-o',str(out/'startup-probe')]
with (out/'startup-compile.log').open('w') as log:subprocess.run(startup_cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
with (out/'startup-test.log').open('w') as log:startup=subprocess.run([str(out/'startup-probe')],stdout=log,stderr=subprocess.STDOUT,timeout=15)
record={'scope':__doc__,'command':cmd,'inputs':inputs,'driverSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'exit':r.returncode,'passed':r.returncode==0,'binarySHA256':hashlib.sha256((out/'probe').read_bytes()).hexdigest(),'logSHA256':hashlib.sha256((out/'test.log').read_bytes()).hexdigest()}
record['startup']={'exit':startup.returncode,'command':startup_cmd,'baseline':a.startup_baseline,'functionSHA256':hashlib.sha256((out/'track-refresh-function.c').read_bytes()).hexdigest(),'logSHA256':hashlib.sha256((out/'startup-test.log').read_bytes()).hexdigest()}
record['passed']=record['passed'] and startup.returncode==0 and not a.startup_baseline
(out/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'passed':record['passed']}));raise SystemExit(0 if record['passed'] else 1)

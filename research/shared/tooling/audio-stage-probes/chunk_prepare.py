# SPDX-License-Identifier: Apache-2.0
import subprocess,pathlib,time,json,sys
out=pathlib.Path(sys.argv[1]);commands=[]
def run(args):
 t=time.perf_counter();p=subprocess.run(args,capture_output=True);duration=time.perf_counter()-t;commands.append({'args':args,'wall_seconds':duration,'exit':p.returncode,'stderr':p.stderr.decode()});assert p.returncode==0,p.stderr;return duration
base=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y']
run(base+['-f','lavfi','-i','aevalsrc=0.3*sin(2*PI*(411*t+0.7*t*t))|0.25*sin(2*PI*(713*t+0.4*t*t)):s=48000:d=30','-sample_fmt','s16','-c:a','flac',str(out/'source.flac')])
t=run(base+['-i',str(out/'source.flac'),'-c:a','flac','-f','segment','-segment_time','2','-reset_timestamps','1',str(out/'chunk-%03d.flac')]);chunks=[p.name for p in sorted(out.glob('chunk-*.flac'))];(out/'setup.json').write_text(json.dumps({'chunks':chunks,'preparation_seconds':t,'source_bytes':(out/'source.flac').stat().st_size,'chunk_bytes':sum((out/n).stat().st_size for n in chunks),'commands':commands},indent=2)+'\n');(out/'commands.log').write_text('\n'.join(json.dumps(c) for c in commands)+'\n');print(chunks,t)

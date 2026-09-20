# SPDX-License-Identifier: Apache-2.0
import subprocess,pathlib,time,json,sys
out=pathlib.Path(sys.argv[1]);commands=[];total=0
for i in range(15):
 args=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-ss',str(i*2),'-i',str(out/'source.flac'),'-t','2','-c:a','flac',str(out/f'chunk-{i:03d}.flac')];start=time.perf_counter();p=subprocess.run(args,capture_output=True);duration=time.perf_counter()-start;total+=duration;commands.append({'args':args,'wall_seconds':duration,'exit':p.returncode,'stderr':p.stderr.decode()});assert p.returncode==0,p.stderr
chunks=[p.name for p in sorted(out.glob('chunk-*.flac'))];(out/'setup.json').write_text(json.dumps({'chunks':chunks,'preparation_seconds':total,'source_bytes':(out/'source.flac').stat().st_size,'chunk_bytes':sum((out/n).stat().st_size for n in chunks),'commands':commands},indent=2)+'\n');(out/'commands.log').write_text('\n'.join(json.dumps(c) for c in commands)+'\n');print('valid independent chunks',len(chunks),'cold prep seconds',total)

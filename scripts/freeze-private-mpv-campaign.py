#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Freeze Player runtime and component-bound media for the private mpv campaign."""
import argparse,hashlib,json,pathlib,shutil,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main(out,fixtures):
 out=out.resolve()
 if out.exists():raise ValueError('Fresh campaign snapshot required')
 (out/'web').mkdir(parents=True);(out/'fixtures').mkdir()
 engines={'engine-remux','engine-subtitles','engine-selective','engine-remux-jspi','engine-remux-asyncify','engine-adaptation-jspi','engine-adaptation-asyncify',*[f'engine-mpv-{profile}-{backend}'for profile in ['subtitles','audio']for backend in ['jspi','asyncify']]}
 for p in (ROOT/'web').iterdir():
  if p.is_dir():
   if p.name not in engines and p.name not in ['generated','private-mpv','private-ffmpeg','vendor','webgpu']:continue
   shutil.copytree(p,out/'web'/p.name)
  elif p.suffix in ['.js','.mjs']:shutil.copyfile(p,out/'web'/p.name)
 shutil.copyfile(ROOT/'fixtures/DejaVuSans.ttf',out/'fixtures/DejaVuSans.ttf')
 inputs={};commands=[]
 for campaign,names in [('mpv-subtitles-review-01',['m0.mkv','replacement.mkv','movtext.mp4','pgs.mkv','vobsub.mkv']),('mpv-audio-review-01',['pcm.wav','pcm.s16'])]:
  record=json.loads((ROOT/'results/jspi-asyncify'/campaign/'result.json').read_text())
  for name in names:
   source=fixtures/name;wanted=record['inputs']['/fixtures/'+name]['sha256']
   if sha(source)!=wanted:raise ValueError('Component fixture drift: '+name)
   shutil.copyfile(source,out/'fixtures'/name);inputs[name]={'component':campaign,'sha256':wanted}
 def run(args):
  argv=['ffmpeg','-hide_banner','-loglevel','error','-n',*map(str,args)];subprocess.run(argv,check=True);commands.append(argv)
 f=out/'fixtures'
 for seconds,suffix in [(12,''),(36,'-long')]:
  for subs in [False,True]:
   name='pcm'+('-ass' if subs else '')+suffix+'.mkv'
   run(['-stream_loop','-1','-i',f/'pcm.wav','-stream_loop','2','-i',f/'m0.mkv','-map','1:v:0','-map','0:a:0',*(['-map','1:s:0','-map','1:t?']if subs else []),'-t',seconds,'-c','copy',f/name])
 run(['-i',f/'pcm-ass.mkv','-map','0','-c','copy','-c:a','pcm_s24le',f/'pcm24-ass.mkv'])
 run(['-stream_loop','2','-i',f/'m0.mkv','-map','0','-c','copy','-t','36',f/'m0-long.mkv'])
 files={str(p.relative_to(out)):{'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(out.rglob('*'))if p.is_file()}
 (out/'manifest.json').write_text(json.dumps({'files':files,'fixtureInputs':inputs,'fixtureCommands':commands,'freezerSHA256':sha(pathlib.Path(__file__))},indent=2)+'\n')
 print(out)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--fixtures',type=pathlib.Path,required=True);a=p.parse_args();main(a.out,a.fixtures.resolve())

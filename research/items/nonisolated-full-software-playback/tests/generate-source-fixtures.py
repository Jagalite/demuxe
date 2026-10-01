#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Long GOP and valid large MP4 fixtures; external media stays outside Git."""
import argparse,hashlib,json,shutil,struct,subprocess
from pathlib import Path
def sha(p):return hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
def main(out):
 out=out.resolve();out.mkdir();ffmpeg=Path(shutil.which('ffmpeg')).resolve();shutil.copyfile(Path(__file__),out/'generator.py')
 record={'scope':'Long GOP and valid sparse large source correctness fixtures','ffmpeg':str(ffmpeg),'ffmpegSHA256':sha(ffmpeg),'commands':[],'rows':[]}
 def run(args):
  command=[str(ffmpeg),'-hide_banner','-loglevel','error',*map(str,args)];record['commands'].append(command);subprocess.run(command,check=True)
 try:
  for key,duration,padded in [('h264-long-gop',132,False),('h264-large-file',6,True)]:
   folder=out/key;folder.mkdir();fixture=folder/'fixture.mp4'
   run(['-f','lavfi','-i',f'testsrc2=size=320x180:rate=30:duration={duration}','-f','lavfi','-i',f'sine=frequency=997:sample_rate=48000:duration={duration}','-c:v','libx264','-preset','veryfast','-threads','2','-g','180','-keyint_min','180','-sc_threshold','0','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a','aac','-ac','2','-ar','48000','-movflags','+faststart','-shortest',fixture])
   if padded:
    initial=fixture.stat().st_size
    with fixture.open('r+b') as f:f.seek(0,2);f.write(struct.pack('>I4s',80*1024*1024,b'free'));f.seek(80*1024*1024-9,1);f.write(b'\0')
    if fixture.stat().st_size!=initial+80*1024*1024:raise ValueError('Large free box size mismatch')
    record['padding']={'key':key,'atom':'free','bytes':80*1024*1024,'scope':'Valid MP4 box; sparse zeros retain a finite source beyond prototype byte cap'}
   run(['-i',fixture,'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24',folder/'reference.rgb'])
   record['rows'].append({'profile':{'key':key,'fixture':str(fixture),'width':320,'height':180,'fps':30,'duration':duration,'seekTargets':[65.5,100.5,130.5] if duration>60 else [.5,1.5,2.5]},'files':{p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in folder.iterdir()}})
  record['status']='generated'
 except Exception as e:record.update(status='failed',error=str(e));raise
 finally:(out/'references.json').write_text(json.dumps(record,indent=2)+'\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);main(p.parse_args().out)

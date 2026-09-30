#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Fresh bounded codec fixtures with independently decoded RGB/PCM references."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main(out):
 out=out.resolve();out.mkdir();ffmpeg=Path(shutil.which('ffmpeg')).resolve()
 shutil.copyfile(Path(__file__),out/'generator.py')
 record={'scope':'Synthetic six-second codec correctness fixtures','ffmpeg':str(ffmpeg),'ffmpegSHA256':digest(ffmpeg),'generatorSHA256':digest(Path(__file__)),'commands':[],'rows':[]}
 specs=[('h264-ac3','mkv','libx264',['-preset','veryfast'],'ac3'),('hevc-ac3','mkv','libx265',['-preset','ultrafast','-x265-params','pools=2:frame-threads=1'],'ac3'),('vp8-vorbis','webm','libvpx',['-deadline','realtime','-cpu-used','8'],'vorbis'),('vp9-opus','webm','libvpx-vp9',['-deadline','realtime','-cpu-used','8'],'libopus'),('av1-flac','mkv','libsvtav1',['-preset','12','-svtav1-params','lp=2'],'flac')]
 def run(args):
  command=[str(ffmpeg),'-hide_banner','-loglevel','error',*map(str,args)];record['commands'].append(command)
  subprocess.run(command,check=True)
 try:
  for key,ext,encoder,options,audio in specs:
   folder=out/key;folder.mkdir();fixture=folder/('fixture.'+ext)
   run(['-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=6','-f','lavfi','-i','sine=frequency=997:sample_rate=48000:duration=6','-c:v',encoder,*options,'-threads','2','-g','60','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a',audio,'-strict','experimental','-ac','2','-ar','48000','-shortest',fixture])
   run(['-i',fixture,'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24',folder/'reference.rgb'])
   run(['-i',fixture,'-map','0:a:0','-f','f32le','-ac','2','-ar','48000',folder/'reference.f32'])
   record['rows'].append({'profile':{'key':key,'fixture':str(fixture),'width':320,'height':180,'fps':30,'duration':6},'files':{p.name:{'sha256':digest(p),'bytes':p.stat().st_size} for p in folder.iterdir()}})
  record['status']='generated'
 except Exception as error:record.update(status='failed',error=str(error));raise
 finally:(out/'references.json').write_text(json.dumps(record,indent=2)+'\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);main(p.parse_args().out)

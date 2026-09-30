#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Tagged 10-bit/HDR and larger decode frames with independent SDR references."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
TONE='zscale=transfer=linear:npl=100,format=gbrpf32le,zscale=primaries=bt709,tonemap=tonemap=mobius:desat=0,zscale=transfer=bt709:matrix=bt709:range=limited,format=yuv420p'
def sha(p):return hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
def main(out,reference_ffmpeg):
 out=out.resolve();out.mkdir();ffmpeg=Path(shutil.which('ffmpeg')).resolve();shutil.copyfile(Path(__file__),out/'generator.py')
 reference_ffmpeg=reference_ffmpeg.resolve() if reference_ffmpeg else ffmpeg
 record={'referenceFFmpeg':str(reference_ffmpeg),'referenceFFmpegSHA256':sha(reference_ffmpeg),'scope':'10-bit/HDR and HD decode correctness fixtures','ffmpeg':str(ffmpeg),'ffmpegSHA256':sha(ffmpeg),'commands':[],'rows':[]}
 def run(args,reference=False):
  argv=[str(reference_ffmpeg if reference else ffmpeg),'-hide_banner','-loglevel','error',*map(str,args)];record['commands'].append(argv);subprocess.run(argv,check=True)
 try:
  for key,width,height,fps,codec,hdr,ten in [('hevc10-sdr',320,180,30,'libx265',False,True),('hevc10-pq',320,180,30,'libx265',True,True),('h264-720p',1280,720,30,'libx264',False,False),('h264-1080p',1920,1080,30,'libx264',False,False),('hevc10-4k',3840,2160,5,'libx265',False,True)]:
   folder=out/key;folder.mkdir();fixture=folder/'fixture.mkv';color=['-color_primaries','bt2020' if hdr else 'bt709','-color_trc','smpte2084' if hdr else 'bt709','-colorspace','bt2020nc' if hdr else 'bt709']
   options=['-c:v',codec,'-preset','ultrafast','-threads','2','-pix_fmt','yuv420p10le' if ten else 'yuv420p',*color]
   if codec=='libx265':options+=['-x265-params','pools=2:frame-threads=1:log-level=error:keyint='+str(fps*2)+(':colorprim=9:transfer=16:colormatrix=9' if hdr else ':colorprim=1:transfer=1:colormatrix=1')]
   else:options+=['-g',str(fps*2)]
   run(['-f','lavfi','-i',f'testsrc2=size={width}x{height}:rate={fps}:duration=6','-f','lavfi','-i','sine=frequency=997:sample_rate=48000:duration=6','-map','0:v','-map','1:a',*options,'-c:a','pcm_s24le','-ac','2','-shortest',fixture])
   filters=(TONE+',' if hdr else '')+'scale=320:180:flags=bilinear,format=rgb24'
   run(['-i',fixture,'-map','0:v:0','-vf',filters,'-f','rawvideo',folder/'reference.rgb'],reference=True)
   run(['-i',fixture,'-map','0:a:0','-f','f32le','-ac','2','-ar','48000',folder/'reference.f32'])
   record['rows'].append({'profile':{'key':key,'fixture':str(fixture),'width':320,'height':180,'decodeWidth':width,'decodeHeight':height,'fps':fps,'duration':6,'toneMapping':'hdr-to-sdr' if hdr else 'off'},'files':{p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in folder.iterdir()}})
  record['status']='generated'
 except Exception as e:record.update(status='failed',error=str(e));raise
 finally:(out/'references.json').write_text(json.dumps(record,indent=2)+'\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--reference-ffmpeg',type=Path);args=p.parse_args();main(args.out,args.reference_ffmpeg)

# SPDX-License-Identifier: Apache-2.0
"""Create independent, reproducible fixtures and a frozen source-build runtime."""
import hashlib, json, pathlib, shutil, subprocess, sys
root = pathlib.Path(__file__).resolve().parents[2]
out = root / (sys.argv[1] if len(sys.argv)>1 else 'build/seamless-switching')
out.mkdir(parents=True, exist_ok=False)
commands=[]
def ff(*args):
    cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error',*map(str,args)]
    commands.append(cmd); subprocess.run(cmd,check=True)
media=out/'media'; media.mkdir()
ff('-f','lavfi','-i','sine=frequency=997:sample_rate=48000','-t',32,'-c:a','aac','-b:a','128k',media/'audio.m4a')
variants=[('low','640x360',30,'red',600000),('high','1280x720',30,'lime',1800000),('fast','1280x720',60,'blue',3000000)]
for name,size,fps,color,rate in variants:
    folder=media/name; folder.mkdir()
    ff('-f','lavfi','-i',f'testsrc2=size={size}:rate={fps}','-t',32,'-vf',f'drawbox=x=0:y=0:w=64:h=64:color={color}:t=fill','-an','-c:v','libx264','-preset','veryfast','-profile:v','high','-level:v','3.2','-b:v',rate,'-g',fps,'-keyint_min',fps,'-sc_threshold',0,'-pix_fmt','yuv420p',folder/'video.mp4')
    ff('-i',folder/'video.mp4','-c','copy','-hls_time',1,'-hls_segment_type','fmp4','-hls_playlist_type','vod',folder/'index.m3u8')
    ff('-i',folder/'video.mp4','-i',media/'audio.m4a','-map','0:v','-map','1:a','-c','copy','-movflags','+faststart',media/f'{name}.mp4')
audio=media/'audio'; audio.mkdir()
ff('-i',media/'audio.m4a','-c','copy','-hls_time',1,'-hls_segment_type','fmp4','-hls_playlist_type','vod',audio/'index.m3u8')
master=['#EXTM3U','#EXT-X-VERSION:7','#EXT-X-INDEPENDENT-SEGMENTS','#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Shared",DEFAULT=YES,AUTOSELECT=YES,URI="audio/index.m3u8"']
for name,size,fps,color,rate in variants:
    master += [f'#EXT-X-STREAM-INF:BANDWIDTH={rate+128000},RESOLUTION={size},FRAME-RATE={fps},CODECS="avc1.640020,mp4a.40.2",AUDIO="audio"',f'{name}/index.m3u8']
(media/'master.m3u8').write_text('\n'.join(master)+'\n')
web=out/'runtime/web'; web.mkdir(parents=True)
for f in (root/'web').glob('*.js'): shutil.copy2(f,web/f.name)
shutil.copytree(root/'web/vendor',web/'vendor')
subprocess.run(['node','node_modules/typescript/bin/tsc','--outDir',str(web/'generated')],cwd=root,check=True)
hashes={str(f.relative_to(out)):hashlib.sha256(f.read_bytes()).hexdigest() for f in out.rglob('*') if f.is_file()}
sources={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (root/'src').rglob('*.ts')}
(out/'manifest.json').write_text(json.dumps({'revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'commands':commands,'files':hashes,'sources':sources},indent=2)+'\n')
print(out)

# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys,hashlib
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False);commands=[]
for name,src in [('gray','nullsrc=size=320x192:rate=24,geq=lum=16+219*X/W:cb=128:cr=128'),('color','smptebars=size=320x192:rate=24')]:
    cmd=['ffmpeg','-v','error','-f','lavfi','-i',src,'-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','8','-c:v','ffv1','-pix_fmt','yuv420p','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-color_range','tv','-c:a','pcm_s16le','-ac','2',str(out/(name+'.mkv'))]
    subprocess.run(cmd,check=True);commands.append(cmd)
    cmd=['ffmpeg','-v','error','-i',str(out/(name+'.mkv')),'-vf','scale=in_color_matrix=bt709:out_color_matrix=bt709:in_range=tv:out_range=pc','-frames:v','1','-pix_fmt','rgb24',str(out/(name+'.png'))]
    subprocess.run(cmd,check=True);commands.append(cmd)
(out/'fixture.json').write_text(json.dumps({'commands':commands,'license':'Original synthetic fixtures, CC-BY-4.0','scope':'Static independent pixel oracle, 8s real FFV1+PCM playback; no source frame identity/cadence claim','files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file()}},indent=2)+'\n')

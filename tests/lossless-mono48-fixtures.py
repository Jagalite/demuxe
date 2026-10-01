#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""48 kHz mono lossless packet and video composition fixtures; exact header precision."""
import pathlib,subprocess,json,hashlib,shutil
root=pathlib.Path('/tmp/demuxe-lossless-mono48');root.mkdir(exist_ok=True);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();rows=[];comps=[]
for codec,bits in [('mlp',16),('mlp',24),('truehd',24)]:
 ident=f'{codec}{bits}-48000-1';p=root/(ident+('.mlp'if codec=='mlp'else'.thd'))
 subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','aevalsrc=0.08*sin(2*PI*337*t):s=48000:d=6.137:c=mono','-c:a',codec,'-strict','-2','-sample_fmt','s16p'if bits==16 else's32p','-bits_per_raw_sample',str(bits),str(p)],check=True)
 metadata=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(p)]));stream=metadata['streams'][0];assert int(stream['sample_rate'])==48000 and stream['channels']==1 and int(stream['bits_per_raw_sample'])==bits
 packet=root/(ident+'.json');packet.write_text(json.dumps(metadata)+'\n');frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output(['ffprobe','-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples','-of','json',str(p)]))
 for suffix,fmt in [('s32','s32le'),('f32','f32le')]:subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',str(p),'-f',fmt,str(root/(ident+'.'+suffix))],check=True)
 row=dict(id=ident,profile='truehd-mlp',codec=codec,sampleRate=48000,channels=1,bitsPerSample=bits,input=str(p),inputSHA256=sha(p),packetSHA256=sha(packet),referenceSHA256=sha(root/(ident+'.s32')),referenceF32SHA256=sha(root/(ident+'.f32')),framesSHA256=sha(frames),referenceSamples=(root/(ident+'.s32')).stat().st_size//4,generated=True,fixtureRoot=str(root));rows.append(row)
 video=root/(ident+'-video.mkv');subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=s=96x64:r=10:d=6.137','-i',str(p),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','ultrafast','-bf','0','-c:a','copy','-strict','-2',str(video)],check=True)
 comp=dict(row,id=ident+'-video',input=str(video),inputSHA256=sha(video),container='matroska');comps.append(comp)
 for suffix in ['s32','f32']:shutil.copyfile(root/(ident+'.'+suffix),root/(comp['id']+'.'+suffix))
for name,data in [('fixtures',rows),('packet-browser',rows),('compositions',comps),('composition-browser',comps)]: (root/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
record={}
for name in ['ffmpeg','ffprobe']:
 p=pathlib.Path(shutil.which(name)).resolve();record[name]={'path':str(p),'sha256':sha(p),'version':subprocess.check_output([str(p),'-version']).decode()}
(root/'reference-tools.json').write_text(json.dumps(record,indent=2)+'\n');print(len(rows),'mono48 fixtures')

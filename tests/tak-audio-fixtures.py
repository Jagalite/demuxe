#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Pinned official TAK fixture; no encoder-generated family qualification."""
import pathlib,json,subprocess,hashlib,shutil,urllib.request,os
root=pathlib.Path('/tmp/demuxe-tak-fixtures');root.mkdir(parents=True,exist_ok=True);original=pathlib.Path('/tmp/demuxe-archive-next-inventory/lostchord-tak_2_2_0.tak');url='https://samples.ffmpeg.org/A-codecs/tak/lostchord-tak_2_2_0.tak';digest='6696820264e05fd1dda2355a4ba92d2fc573716881d633553eaee448dd4b2eec';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if not original.exists():
 if os.environ.get('TAK_FETCH_CANONICAL')!='1':raise ValueError('Missing pinned TAK original')
 with urllib.request.urlopen(url,timeout=60)as response:original.write_bytes(response.read())
assert sha(original)==digest
ident='tak-canonical';p=root/(ident+'.tak');shutil.copyfile(original,p);data=subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(p)]);(root/(ident+'.json')).write_bytes(data);stream=json.loads(data)['streams'][0]
for fmt,ext in [('s32le','s32'),('f32le','f32')]:subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',str(p),'-f',fmt,str(root/(ident+'.'+ext))],check=True)
frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output(['ffprobe','-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples,sample_fmt,channel_layout','-of','json',str(p)]))
row=dict(id=ident,profile='archive-next',codec='tak',sampleRate=int(stream['sample_rate']),channels=stream['channels'],bitsPerSample=int(stream['bits_per_raw_sample']),input=str(p),inputSHA256=sha(p),packetSHA256=sha(root/(ident+'.json')),framesSHA256=sha(frames),referenceSHA256=sha(root/(ident+'.s32')),referenceF32SHA256=sha(root/(ident+'.f32')),referenceSamples=(root/(ident+'.s32')).stat().st_size//(4*stream['channels']),sourceURL=url,originSHA256=digest,fixtureRoot=str(root),generated=True)
(root/'fixtures.json').write_text(json.dumps([row],indent=2)+'\n');print('Canonical TAK fixture ready')

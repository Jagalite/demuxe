#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Pinned canonical SHN reference; missing native PTS stay explicitly missing."""
import pathlib,json,subprocess,hashlib,shutil,urllib.request,os
root=pathlib.Path('/tmp/demuxe-shorten-fixtures');root.mkdir(parents=True,exist_ok=True);original=pathlib.Path('/tmp/demuxe-archive-next-inventory/luckynight.shn');url='https://samples.ffmpeg.org/A-codecs/lossless/luckynight.shn';digest='16852768010391248078df61b7e2f46f7b3c35877add049f85917caf13e30e7f';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if not original.exists():
 if os.environ.get('SHORTEN_FETCH_CANONICAL')!='1':raise ValueError('Missing pinned Shorten original')
 original.parent.mkdir(parents=True,exist_ok=True)
 with urllib.request.urlopen(url,timeout=60)as response:original.write_bytes(response.read())
assert sha(original)==digest
ident='shorten-canonical';p=root/(ident+'.shn');shutil.copyfile(original,p);raw=subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(p)]);(root/(ident+'.json')).write_bytes(raw);data=json.loads(raw);assert all('pts_time'not in packet for packet in data['packets'])
for fmt,ext in [('s32le','s32'),('f32le','f32')]:subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',str(p),'-f',fmt,str(root/(ident+'.'+ext))],check=True)
frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output(['ffprobe','-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples,sample_fmt,channel_layout','-of','json',str(p)]));assert all('pts_time'not in f for f in json.loads(frames.read_bytes())['frames'])
row=dict(id=ident,profile='archive-historical',codec='shorten',sampleRate=44100,channels=2,bitsPerSample=16,input=str(p),inputSHA256=sha(p),packetSHA256=sha(root/(ident+'.json')),framesSHA256=sha(frames),referenceSHA256=sha(root/(ident+'.s32')),referenceF32SHA256=sha(root/(ident+'.f32')),referenceSamples=(root/(ident+'.s32')).stat().st_size//8,sourceURL=url,originSHA256=digest,fixtureRoot=str(root),generated=False,timestampOrigin='stream-clock',timestampContract='derived-stream-clock',seekContract='restart-from-start-and-discard')
(root/'fixtures.json').write_text(json.dumps([row],indent=2)+'\n')
browser={**row,'generated':True,'fixtureOrigin':'official','synthetic':False}
(root/'packet-browser.json').write_text(json.dumps([browser],indent=2)+'\n')
composition_id='standalone-shorten-canonical-flac'
for ext in ['shn','json','frames.json','s32','f32']:shutil.copyfile(root/(ident+'.'+ext),root/(composition_id+'.'+ext))
(root/'composition-browser.json').write_text(json.dumps([{**browser,'id':composition_id,'input':str(root/(composition_id+'.shn')),'container':'shorten','audioOnly':True}],indent=2)+'\n')
print('Canonical Shorten fixture ready')

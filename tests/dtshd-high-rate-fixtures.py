#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Original high-rate DTS-HD MA packets plus declared canonical repeat streams."""
import pathlib,urllib.request,json,subprocess,hashlib,shutil
root=pathlib.Path('/tmp/demuxe-p23-dtshd');root.mkdir(exist_ok=True);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();rows=[];comps=[]
PINS={'xll_71_24_96_768.dtshd': 'd2911b34183f7379359cf914ee93228796894e0b0f0055e6ee5baefa4fd6a923', 'xll_51_16_192_768_0.dtshd': '34441a4f2df89e086f67a7b0f72aa871e1cbb3b04b301470a7727038bb91b618', 'xll_x96_51_24_96_1509.dtshd': 'ac8de7e1f2875145aff90db2953f62fb4910e301d7fb48007eb3db0a36d09e90'}
def register(ident,p,origin,url,repeat):
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(p)]));stream=data['streams'][0];packet=root/(ident+'.json');packet.write_text(json.dumps(data)+'\n');frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output(['ffprobe','-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples','-of','json',str(p)]))
 for ext,fmt in [('s32','s32le'),('f32','f32le')]:subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',str(p),'-f',fmt,str(root/(ident+'.'+ext))],check=True)
 row=dict(id=ident,profile='dts-hd',codec='dts-hd',sampleRate=int(stream['sample_rate']),channels=stream['channels'],bitsPerSample=int(stream['bits_per_raw_sample']),input=str(p),inputSHA256=sha(p),originSHA256=sha(origin),sourceURL=url,packetSHA256=sha(packet),framesSHA256=sha(frames),referenceSHA256=sha(root/(ident+'.s32')),referenceF32SHA256=sha(root/(ident+'.f32')),referenceSamples=(root/(ident+'.s32')).stat().st_size//4//stream['channels'],generated=True,fixtureRoot=str(root),derivation={'canonicalCompletePacketStreamRepeats':repeat,'note':'Intentional packet-repeat test stream independently decoded; original canonical stream tested separately.'}if repeat>1 else None);rows.append(row)
 if repeat>1 and row['sampleRate']==96000:
  video=root/(ident+'-video.mkv');subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=s=96x64:r=10:d=3.84','-i',str(p),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','ultrafast','-bf','0','-c:a','copy',str(video)],check=True);comp=dict(row,id=ident+'-video',input=str(video),inputSHA256=sha(video),container='matroska');comps.append(comp)
  for ext in ['s32','f32']:shutil.copyfile(root/(ident+'.'+ext),root/(comp['id']+'.'+ext))
for name,digest in PINS.items():
 origin=root/name;url='https://fate-suite.ffmpeg.org/dts/dcadec-suite/'+name
 if not origin.exists():urllib.request.urlretrieve(url,origin)
 assert sha(origin)==digest
 ident=origin.stem;p=root/(ident+'.dts');subprocess.run(['ffmpeg','-v','error','-y','-i',str(origin),'-c:a','copy','-f','dts',str(p)],check=True);register(ident,p,origin,url,1)
 repeated=root/(ident+'-repeat60.dts');repeated.write_bytes(p.read_bytes()*60);register(ident+'-repeat60',repeated,origin,url,60)
for name,data in [('fixtures',rows),('packet-browser',[r for r in rows if r['derivation']]),('composition-browser',comps),('compositions',comps)]: (root/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
print(len(rows),'DTS-HD packet fixtures,',len(comps),'96k video compositions')

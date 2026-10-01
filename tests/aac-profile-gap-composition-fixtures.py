#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Copy proven AAC packets beside no-reorder AVC; retain independent presentation refs."""
import pathlib,json,subprocess,hashlib,math,struct
root=pathlib.Path('/tmp/demuxe-aac-p23-compositions');root.mkdir(exist_ok=True)
ref=pathlib.Path('/tmp/demuxe-aac-profile-native-reference');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
reference_record=ref/'build-record.json';reference_build=json.loads(reference_record.read_text())
for name in ['ffmpeg','ffprobe']:assert sha(ref/name)==reference_build['artifacts'][name]['sha256']
rows=[]
for f in json.loads(pathlib.Path('/tmp/demuxe-aac-p23-browser-fixtures/conformance.json').read_text()):
 if f['channels']!=2 or f['sampleRate'] not in [32000,44100,48000] or f['aacProfile']=='lc':continue
 src=pathlib.Path(f['input']);assert sha(src)==f['inputSHA256']
 source_bytes=src.read_bytes();mv=source_bytes.index(b'mvhd');movie_scale=int.from_bytes(source_bytes[mv+16:mv+20],'big');original_edit=source_bytes.index(b'elst');edit_payload=source_bytes[original_edit+4:original_edit+24]
 ident='av-'+f['id'];video=root/(ident+'-video.mp4');out=root/(ident+'.mp4')
 subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=160x90:rate=25','-t',str(math.ceil(f['referenceSamples']/f['sampleRate'])),'-c:v','libx264','-profile:v','baseline','-bf','0','-pix_fmt','yuv420p',str(video)],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(video),'-i',str(src),'-map','0:v:0','-map','1:a:0','-c','copy','-movie_timescale',str(movie_scale),str(out)],check=True)
 # FFmpeg packet copy can round away the original presentation tail. Preserve
 # the original audio edit verbatim, never derive it from candidate PCM.
 copied=bytearray(out.read_bytes());edits=[];at=0
 while (at:=copied.find(b'elst',at+1))!=-1:edits.append(at)
 assert len(edits)==2 and len(edit_payload)==20
 copied[edits[1]+4:edits[1]+24]=edit_payload;out.write_bytes(copied)
 packet=root/(ident+'.json');packet.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(out)]))
 def payload(p):return ''.join(l.split(':')[1].split('  ')[0].replace(' ','') for l in p['data'].splitlines() if ':'in l)
 original=json.loads(pathlib.Path(f['packetFile']).read_text());actual=json.loads(packet.read_text());ai=next(s['index']for s in actual['streams']if s['codec_type']=='audio')
 assert [payload(p)for p in original['packets']]==[payload(p)for p in actual['packets']if p['stream_index']==ai]
 pcm=root/(ident+'.f32');subprocess.run([str(ref/'ffmpeg'),'-v','error','-xerror','-cpuflags','0','-y','-i',str(out),'-map','0:a:0','-f','f32le',str(pcm)],check=True)
 # Muxing must preserve the exact independently decoded movie presentation.
 assert list(struct.iter_unpack('<f',pcm.read_bytes()))==list(struct.iter_unpack('<f',pathlib.Path(f['reference']).read_bytes())) # signed zero is numerically identical
 timing_file=root/(ident+'.timing.json');native_frames=json.loads(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-cpuflags','0','-select_streams','a:0','-show_streams','-show_frames','-show_entries','stream=sample_rate,time_base:frame=pts,nb_samples','-of','json',str(out)]));stream=native_frames['streams'][0];num,den=map(int,stream['time_base'].split('/'));tick=f['sampleRate']*num/den;segments=[{'pts':round(frame['pts']*tick),'samples':frame['nb_samples']}for frame in native_frames['frames']];assert sum(x['samples']for x in segments)==f['referenceSamples'];timing_file.write_text(json.dumps({'segments':segments,'toleranceSamples':0,'sourceTimeBase':stream['time_base']},indent=2)+'\n')
 samples=[v[0]for v in struct.iter_unpack('<f',pcm.read_bytes())];assert max(abs(v)for v in samples[int(.7*f['sampleRate'])*2:int(.9*f['sampleRate'])*2])>.02,'Independent post-seek window must contain audible source audio'
 rows.append({**f,'id':ident,'originalPacketId':f['id'],'fixtureRoot':str(root),'container':'isobmff','encodings':['flac'],'playbackSeekSeconds':.7,'input':str(out),'inputSHA256':sha(out),'packetFile':str(packet),'packetSHA256':sha(packet),'reference':str(pcm),'referenceF32SHA256':sha(pcm),'sourceInputSHA256':f['inputSHA256'],'videoSHA256':sha(video),'referenceContract':'independent-scalar-aac-presentation','referenceInputSHA256':sha(out),'referenceBuildFile':str(reference_record),'referenceBuildSHA256':sha(reference_record),'referenceBinary':str(ref/'ffmpeg'),'referenceBinarySHA256':sha(ref/'ffmpeg'),'timingFile':str(timing_file),'timingSHA256':sha(timing_file),'referenceExecutableSHA256':sha(ref/'ffmpeg'),'originalAudioEditHex':edit_payload.hex(),'originalMovieTimescale':movie_scale})
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'original AAC movie compositions')

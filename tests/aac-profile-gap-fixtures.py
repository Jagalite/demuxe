#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Actual finite AAC extension ASC/profile samples with scalar FFmpeg9 references."""
import pathlib,subprocess,json,hashlib,urllib.request
root=pathlib.Path('/tmp/demuxe-aac-p23-fixtures');root.mkdir(exist_ok=True);ref=pathlib.Path('/tmp/demuxe-aac-profile-native-reference');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
record=json.loads((ref/'build-record.json').read_text())
for name in ['ffmpeg','ffprobe']:assert sha(ref/name)==record['artifacts'][name]['sha256']
PINS={'al_sbr_cm_48_5.1.mp4': ('https://fate-suite.ffmpeg.org/aac/al_sbr_cm_48_5.1.mp4', 'c49bf6c206e015b26f34d109693ac11e2434edebc321462c75b254d27a49ccf5'), 'al_sbr_ps_06_new.mp4': ('https://fate-suite.ffmpeg.org/aac/al_sbr_ps_06_new.mp4', '19d241d01cc3490a133ade50f3dec58d2872ada855cf0d0f954102e774cd9841'), 'al_sbr_sr_48_2_fsaac48.mp4': ('https://fate-suite.ffmpeg.org/aac/al_sbr_sr_48_2_fsaac48.mp4', 'd0b286c5f9bdb47ee1722ab64775cc507de27744c6a21143ce41fc7410cdbceb'), 'aac-sce-in-stereo.mp4': ('https://fate-suite.ffmpeg.org/aac/aac-sce-in-stereo.mp4', '2dc4e9412aa9912011893fd3fd27ff79c643b51decc3d3318f04bbb525825aa4'), 'al22_chCfg0PCE_44.mp4': ('https://fate-suite.ffmpeg.org/aac/al22_chCfg0PCE_44.mp4', '1f343206a3323817b1d36008b0b82d2ca8a6dceddfe3b398dc0d9a20b159dcdc'), 'Fd_2_c1_Ms_0x01.mp4': ('https://fate-suite.ffmpeg.org/aac/Fd_2_c1_Ms_0x01.mp4', '8a5869362d2c2548d9fe4ed7b1d6e6601f8d6ac1d177a90144991b6938a63ed2'), 'Fd_2_c1_Ms_0x04.mp4': ('https://fate-suite.ffmpeg.org/aac/Fd_2_c1_Ms_0x04.mp4', '700fd64df4ddc4030711018346023cdd74471f618147133384f24401f7fd9af3'), 'Fd_2_c1_0x03.mp4': ('https://fate-suite.ffmpeg.org/aac/usac/Fd_2_c1_0x03.mp4', 'd9b33c6a13f6c4a54c58811e7a46cea14c89d94660f57a1cefb9760f8ecb95ed'), 'Fd_2_c1_0x05.mp4': ('https://fate-suite.ffmpeg.org/aac/usac/Fd_2_c1_0x05.mp4', '89a80fe18bfa917b967714cad99c07b9e67c3b317f90ec9cc36e7cfffcbf009c')}
rows=[]
for name,(url,digest)in PINS.items():
 source=root/name
 if not source.exists():urllib.request.urlretrieve(url,source)
 assert sha(source)==digest
 ident='aac-p23-'+source.stem;packet=root/(ident+'.json');packet.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(source)]));data=json.loads(packet.read_bytes());stream=data['streams'][0];rate=int(stream['sample_rate']);channels=stream['channels']
 frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples','-of','json',str(source)]));pcm=root/(ident+'.f32');subprocess.run([str(ref/'ffmpeg'),'-v','error','-xerror','-cpuflags','0','-y','-i',str(source),'-f','f32le',str(pcm)],check=True)
 skip=sum(side.get('skip_samples',0)for p in data['packets']for side in p.get('side_data_list',[])if side['side_data_type']=='Skip Samples');discard=sum(side.get('discard_padding',0)for p in data['packets']for side in p.get('side_data_list',[])if side['side_data_type']=='Skip Samples')
 profile='he-v2'if name.startswith('al_sbr_ps')else'he'if name.startswith('al_sbr')else'usac'if name.startswith('Fd_')else'lc'
 rows.append(dict(id=ident,profile='aac',codec='aac',aacProfile=profile,sampleRate=rate,channels=channels,bitsPerSample=0,input=str(source),inputSHA256=digest,sourceURL=url,packetSHA256=sha(packet),framesSHA256=sha(frames),referenceF32SHA256=sha(pcm),referenceSamples=pcm.stat().st_size//4//channels,referenceSkipSamples=skip,referenceDiscardSamples=discard,fixtureRoot=str(root),generated=True))
for f in rows:
 if 'aac-sce' in f['id']:f.update(expectedRejection='PROVIDER_PROFILE_MISMATCH',expectedMessage='Unqualified AAC stereo single-channel element or leading syntax',unsupportedStructure='Leading SCE under stereo ASC can leave the second native plane unwritten; no inferred duplication or allocator-dependent reference.')
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');(root/'packet-browser.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'AAC profile fixtures')

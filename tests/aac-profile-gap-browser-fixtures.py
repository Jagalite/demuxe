#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Bounded complete-packet AAC copies with independently decoded clocks and PCM."""
import pathlib,json,subprocess,hashlib,shutil
root=pathlib.Path('/tmp/demuxe-aac-p23-fixtures');out=pathlib.Path('/tmp/demuxe-aac-p23-browser-fixtures');out.mkdir(exist_ok=True);ref=pathlib.Path('/tmp/demuxe-aac-profile-native-reference')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def unhex(s):return bytes.fromhex(''.join(l.split(':')[1].split('  ')[0].replace(' ','')for l in s.splitlines()if ':'in l))
profiles={'he':'he-configured-float','he-v2':'he-v2-stereo32','usac':'usac-stereo-configured','lc':'lc-pce8-44100'}
rows=[];descriptors=[]
for f in json.loads((root/'fixtures.json').read_text()):
 if 'aac-sce' in f['id']:continue # Retained failed native control, not an admitted descriptor.
 assert sha(pathlib.Path(f['input']))==f['inputSHA256'];original=json.loads((root/(f['id']+'.json')).read_text());assert sha(root/(f['id']+'.json'))==f['packetSHA256']
 ident='bounded-'+f['id'];media=out/(ident+'.mp4');subprocess.run(['ffmpeg','-v','error','-y','-i',f['input'],'-map','0:a:0','-c:a','copy','-t','14' if f['aacProfile']=='he-v2' else '3','-movflags','+faststart',str(media)],check=True)
 packet=out/(ident+'.json');packet.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(media)]));data=json.loads(packet.read_bytes());assert unhex(data['streams'][0]['extradata'])==unhex(original['streams'][0]['extradata']);assert len(data['packets'])<=len(original['packets'])
 for p,q in zip(data['packets'],original['packets']):assert unhex(p['data'])==unhex(q['data']);assert round(float(p['pts_time'])*f['sampleRate'])==round(float(q['pts_time'])*f['sampleRate'])
 frames=out/(ident+'.frames.json');frames.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples','-of','json',str(media)]));pcm=out/(ident+'.f32');subprocess.run([str(ref/'ffmpeg'),'-v','error','-xerror','-cpuflags','0','-y','-i',str(media),'-f','f32le',str(pcm)],check=True)
 sides=[s for p in data['packets']for s in p.get('side_data_list',[])if s['side_data_type']=='Skip Samples'];skip=sum(s.get('skip_samples',0)for s in sides);discard=sum(s.get('discard_padding',0)for s in sides)
 timing=out/(ident+'.timing.json');segments=[{'pts':round(float(x['pts_time'])*f['sampleRate']),'samples':x['nb_samples']}for x in json.loads(frames.read_bytes())['frames']];samples=pcm.stat().st_size//4//f['channels'];assert sum(s['samples']for s in segments)==samples;timing.write_text(json.dumps({'segments':segments,'toleranceSamples':0,'referenceBuildSHA256':sha(ref/'build-record.json'),'originalFramesSHA256':sha(frames)},indent=2)+'\n')
 row={**f,'id':ident,'input':str(media),'inputSHA256':sha(media),'fixtureRoot':str(out),'packetSHA256':sha(packet),'framesSHA256':sha(frames),'referenceF32SHA256':sha(pcm),'referenceSamples':samples,'referenceSkipSamples':skip,'referenceDiscardSamples':discard,'sourceInputSHA256':f['inputSHA256'],'sourcePacketSHA256':f['packetSHA256'],'sourceWholePacketPrefixCount':len(data['packets']),'boundedDerivation':'Exact original complete-packet prefix copied to self-contained MP4; independent scalar FFmpeg9 decoded original presentation edits.'}
 rows.append(row);descriptors.append({**row,'target':'audio-aac','decoderProfile':profiles[f['aacProfile']],'packetFile':str(packet),'reference':str(pcm),'timingFile':str(timing),'timingSHA256':sha(timing),'initialSkipSamples':skip,'finalDiscardSamples':discard,'ascHex':unhex(data['streams'][0]['extradata']).hex(),'layout':207 if f['channels']==6 else 20543 if f['channels']==8 else 3})
(out/'packet-browser.json').write_text(json.dumps(rows,indent=2)+'\n');(out/'conformance.json').write_text(json.dumps(descriptors,indent=2)+'\n');print(len(rows),'bounded AAC fixtures')

# Explicit rejection descriptors retain actual malformed stereo structures. No
# allocator-dependent scalar PCM is used as a positive qualification oracle.
negative=[]
f=next(f for f in json.loads((root/'fixtures.json').read_text())if 'aac-sce' in f['id'])
for framing in ['raw','adts']:
 ident='negative-aac-stereo-sce-'+framing;media=out/(ident+('.mp4' if framing=='raw' else '.aac'))
 if framing=='raw':shutil.copyfile(f['input'],media)
 else:subprocess.run(['ffmpeg','-v','error','-y','-i',f['input'],'-map','0:a:0','-c:a','copy','-f','adts',str(media)],check=True)
 packet=out/(ident+'.json');packet.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(media)]));data=json.loads(packet.read_bytes())
 negative.append({'id':ident,'profile':'aac','codec':'aac','aacProfile':'lc','target':'audio-aac','decoderProfile':'configured-float','sampleRate':44100,'channels':2,'bitsPerSample':0,'generated':True,'fixtureOrigin':'official','fixtureRoot':str(out),'input':str(media),'inputSHA256':sha(media),'packetFile':str(packet),'packetSHA256':sha(packet),'ascHex':unhex(data['streams'][0].get('extradata','')).hex(),'sourceInputSHA256':f['inputSHA256'],'sourcePacketSHA256':f['packetSHA256'],'expectedRejection':'PROVIDER_PROFILE_MISMATCH','expectedMessage':f['expectedMessage'],'unsupportedStructure':f['unsupportedStructure'],'packetFraming':framing,'negativeContract':'real-lc-stereo-leading-syntax','sourceContainer':'isobmff' if framing=='raw' else 'adts'})
(out/'negative-browser.json').write_text(json.dumps(negative,indent=2)+'\n');print(len(negative),'actual raw/ADTS rejection descriptors')

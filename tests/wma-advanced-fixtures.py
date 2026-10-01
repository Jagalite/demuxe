#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Real official FFmpeg WMA samples, original codec blocks and scalar references.
Media and large packet/PCM reference files stay in ignored scratch storage.
"""
import pathlib,subprocess,json,hashlib,struct,urllib.request,os
ffmpeg=os.environ.get('WMA_REFERENCE_FFMPEG','ffmpeg');ffprobe=os.environ.get('WMA_REFERENCE_FFPROBE','ffprobe')
root=pathlib.Path(os.environ.get('WMA_ADVANCED_FIXTURE_ROOT','/tmp/demuxe-wma-advanced-fixtures'));root.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def framing(path):
 data=path.read_bytes();pos=30
 for _ in range(struct.unpack_from('<I',data,24)[0]):
  size=struct.unpack_from('<Q',data,pos+16)[0]
  if data[pos:pos+16]==bytes.fromhex('9107dcb7b7a9cf118ee600c00c205365') and data[pos+24:pos+40]==bytes.fromhex('409e69f84d5bcf11a8fd00805f5c442b'):
   count=struct.unpack_from('<I',data,pos+64)[0];fmt=data[pos+78:pos+78+count];tag,ch,rate,avg,align,bits,n=struct.unpack_from('<HHIIHHH',fmt);assert count==18+n
   return dict(codecTag=tag,channels=ch,sampleRate=rate,bitRate=avg*8,blockAlign=align,bitsPerSample=bits,extradataHex=fmt[18:].hex(),waveFormatHex=fmt.hex())
  assert size>=24;pos+=size
 raise ValueError('Missing ASF WAVEFORMATEX')
SAMPLES={
'voice8':('A-codecs/WMA9/WMAVoice/wmav_8.wma','42d5466de2fc43a289aeda7b8df5c7e28d03e504f0b9010efdb3b30b66229ae1'),
'voicevideo':('A-codecs/WMA9/WMAVoice/wmv3-wmaspeeech.wmv','1bde2de6b9070c25842ad02998d774771f8140547637eb335e96b204d9941d40'),
'lossless':('A-codecs/lossless/luckynight.wma','37fe6efab1231f07f46ed8d8bec212c0b97e1535f4931ba02d92138a32f2b6ee'),
'pro8':('A-codecs/WMA9/8_Channel_ID.wma','31af70c41bc5dc02ba8358284246911db851ab68a414c3dd78467abac5be5cad'),
'pro51':('A-codecs/WMA9/WMAPro_5dot1/ambient3_192_mulitchannel.wma','55ff0b58a241f3dc4b82216eb046cfe3fc358161f50f6c96d9b77b82da65a7e0'),
'pro48':('A-codecs/WMA9/wmapro/Classical_48_24_6_Q25_2_3.wma','cf348eff5d609071cc640642c70eb95ff48fcbca39fde83c4b139d9ae361c827'),
'pro96':('A-codecs/WMA9/wmapro/Classical_96_24_2_Q75_2_3.wma','5763bbdb6bc4175656dccd62289c2bca6292736672aec05555fe8f01bced260e'),
'prostereo':('A-codecs/WMA9/wmapro/Beethovens%20nionde%20symfoni%20(Scherzo)-2.wma','f7d406204b8675490f5d8de754f700520b81aaa310f3facc3e6a247b2740450e'),
'voice16-stream':('A-codecs/WMSP/streaming_CBR-19K.wma','8c27217adb15e65da49502ddd0b7188b71011fd4cc23b548d8576e4fa80764e1'),
'voice16-web':('A-codecs/WMSP/webserv-prog_CBR-19K.wma','2a89ecd99a10cc986aabf6aad63b2a3590953b6936dc392515da2acf3d119588'),
'voice8-stream':('A-codecs/WMSP/streaming_CBR-11K.wma','cf0eb21fb98a5b07bb4db6f46c23224c3c8ed48e361b8baab0b3bdf901715dc6'),
'lossless-alt':('A-codecs/WMA9/wma_0x163.wma','e12cf4e973f06fcf6fc1813aa8f3676bea0bbae2d04b1b4eb140521656000649'),
'pro44':('A-codecs/WMA9/wmapro/Classical_44_16_6_256000_0_20.wma','c594975a8fa205fe55b9dc6d3749d61660b97f85ac926acc765345fd781c46a0'),
}
rows=[]
for ident,(relative,expected) in SAMPLES.items():
 url='https://samples.ffmpeg.org/'+relative;source=root/(ident+pathlib.Path(relative).suffix)
 if not source.exists():
  with urllib.request.urlopen(url,timeout=90) as response:source.write_bytes(response.read())
 assert sha(source)==expected,'Official sample changed: '+ident
 fm=framing(source)
 data=json.loads(subprocess.check_output([ffprobe,'-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_data','-of','json',str(source)]));stream=data['streams'][0]
 packet=root/(ident+'.packets.json');packet.write_text(json.dumps(data))
 frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output([ffprobe,'-v','error','-select_streams','a:0','-show_frames','-show_entries','frame=pts_time,best_effort_timestamp_time,nb_samples','-of','json',str(source)]))
 fmt='s32le' if stream['codec_name']=='wmalossless' else 'f32le';reference=root/(ident+('.s32' if fmt=='s32le' else '.f32'))
 result=subprocess.run([ffmpeg,'-v','error','-cpuflags','0','-err_detect','explode','-y','-i',str(source),'-map','0:a:0','-af','asetpts=N/SR/TB','-f',fmt,str(reference)],capture_output=True);assert result.returncode==0,result.stderr.decode();(root/(ident+'.reference.log')).write_bytes(result.stderr)
 expectedFailure='not-implemented' if b'Not yet implemented' in result.stderr else None
 assert not result.stderr or expectedFailure,result.stderr.decode()
 rows.append(dict(id=ident,profile='wma-advanced',codec=stream['codec_name'],sampleRate=fm['sampleRate'],channels=fm['channels'],bitsPerSample=fm['bitsPerSample'],generated=True,expectedFailure=expectedFailure,input=str(source),inputSHA256=sha(source),sourceURL=url,packetSHA256=sha(packet),framesSHA256=sha(frames),referenceSHA256=sha(reference),referenceSamples=reference.stat().st_size//4//fm['channels'],framing=fm))
(root/'reference-tool.json').write_text(json.dumps({'ffmpeg':str(ffmpeg),'ffprobe':str(ffprobe),'ffmpegSHA256':sha(pathlib.Path(ffmpeg)) if pathlib.Path(ffmpeg).is_file() else None,'ffprobeSHA256':sha(pathlib.Path(ffprobe)) if pathlib.Path(ffprobe).is_file() else None,'version':subprocess.check_output([ffmpeg,'-version']).decode().splitlines()[0]},indent=2)+'\n')
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'real advanced WMA fixtures',root)

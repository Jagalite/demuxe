# SPDX-License-Identifier: Apache-2.0
"""Fast MOV/MP4 fixtures derived from the independently decoded ALAC fixture.
Run tests/decoder-family-fixtures.py first. Binary fixtures stay in ignored build.
"""
import json, pathlib, subprocess, shutil, struct
root=pathlib.Path('build/isobmff-fixtures');root.mkdir(parents=True,exist_ok=True)
source=pathlib.Path('build/codec-expansion/decoder-fixtures/alac-48000-2.mov')
assert source.exists(), 'Run tests/decoder-family-fixtures.py first'
cases=[]
for name,codec,extension,args in [
 ('alac-mov','alac','mov',[]),('alac-faststart','alac','mp4',['-movflags','+faststart']),
 ('aac-mp4','aac','mp4',[]),('flac-mp4','flac','mp4',['-strict','experimental']),
 ('f64-exact','pcm_f64le','mov',[]),('f32-exact','pcm_f32le','mov',[]),
]:
 target=root/(name+'.'+extension)
 subprocess.run(['ffmpeg','-v','error','-y','-cpuflags','0','-i',str(source),'-c:v','copy','-c:a',codec,*args,str(target)],check=True)
 cases.append({'id':name,'input':str(target),'codec':{'pcm_f64le':'pcm-f64le','pcm_f32le':'pcm-f32le'}.get(codec,codec),'profile':{'alac':'lossless','flac':'lossless','aac':'aac','pcm_f64le':'pcm','pcm_f32le':'pcm'}[codec]})
for name, codec, extension, rate, channels in [
 ('flac-mono44100','flac','mp4',44100,1),('flac-stereo96000','flac','mp4',96000,2),
 ('flac-surround6','flac','mp4',48000,6),('flac-surround8','flac','mp4',48000,8),
 ('alac-mono44100','alac','mov',44100,1),('f64-mono44100','pcm_f64le','mov',44100,1),
 ('aac-mono44100','aac','mp4',44100,1),
]:
 target=root/(name+'.'+extension)
 subprocess.run(['ffmpeg','-v','error','-y','-cpuflags','0','-i',str(source),'-c:v','copy','-c:a',codec,'-ar',str(rate),'-ac',str(channels),'-strict','experimental',*(['-sample_fmt','s32','-bits_per_raw_sample','24'] if codec=='flac' else []),str(target)],check=True)
 cases.append({'id':name,'input':str(target),'codec':{'pcm_f64le':'pcm-f64le'}.get(codec,codec),'profile':{'alac':'lossless','flac':'lossless','aac':'aac','pcm_f64le':'pcm'}[codec]})
# An odd AAC final sample duration exercises explicit trailing discard rather
# than accepting the encoder's complete padded final packet as presentation.
target=root/'aac-odd.mp4'
subprocess.run(['ffmpeg','-v','error','-y','-cpuflags','0','-i',str(source),'-c:v','copy','-af','apad,atrim=end_sample=15521','-c:a','aac',str(target)],check=True)
cases.append({'id':'aac-odd','input':str(target),'codec':'aac','profile':'aac'})
# Float precision beyond FLAC24 must reject lossless preparation.
target=root/'f64-precision.mov'
shutil.copyfile('build/codec-expansion/decoder-fixtures/pcm-f64le-48000-2.mov',target)
cases.append({'id':'f64-precision','input':str(target),'codec':'pcm-f64le','profile':'pcm','precisionReject':True})
for case in cases:
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',case['input']]))
 stream=next(v for v in probe['streams'] if v['codec_type']=='audio')
 case.update({'container':'isobmff','sampleRate':int(stream['sample_rate']),'channels':stream['channels'],'bitsPerSample':int(stream.get('bits_per_raw_sample') or (64 if case['codec']=='pcm-f64le' else 32 if case['codec']=='pcm-f32le' else 16)),'fixtureRoot':str(root.resolve()),'referenceSamples':round(int(stream['duration_ts'])*int(stream['sample_rate'])/int(stream['time_base'].split('/')[1]))})
 (root/(case['id']+'.json')).write_text(json.dumps(probe)+'\n')
 for fmt in ['f32le','s32le']+(['f64le'] if case['codec']=='pcm-f64le' else []):
  extension={'f32le':'f32','s32le':'s32','f64le':'f64'}[fmt]
  subprocess.run(['ffmpeg','-v','error','-y','-cpuflags','0','-i',case['input'],'-map','0:a:0','-f',fmt,str(root/(case['id']+'.'+extension))],check=True)
for case in cases:
 if case['codec'] in ['flac','alac']:
  data=(root/(case['id']+'.s32')).read_bytes();case['precisionReject']=any(v[0]&255 for v in struct.iter_unpack('<i',data))
 elif case['codec'].startswith('pcm-f'):
  doubles=case['codec']=='pcm-f64le';data=(root/(case['id']+('.f64' if doubles else '.f32'))).read_bytes();case['precisionReject']=any(not (v[0]*8388608).is_integer() for v in struct.iter_unpack('<d' if doubles else '<f',data))
(root/'fixtures.json').write_text(json.dumps(cases,indent=2)+'\n')
print(f'{len(cases)} MOV/MP4 fixtures prepared')

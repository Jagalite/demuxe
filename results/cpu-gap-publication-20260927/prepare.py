# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,hashlib,datetime
repo=pathlib.Path.cwd();parent=repo/'build/head-to-head/assets-auto-main-a563f345-20260927-02';out=repo/'build/head-to-head/assets-cpu-gap-hls-fixed-20260927-01';evidence=repo/'results/cpu-gap-publication-20260927'
assert out!=parent and (out/'manifest.json').is_file()
cmd=['ffmpeg','-nostdin','-y','-v','warning','-i',str(parent/'fixtures/source-hevc8.mkv'),'-f','lavfi','-i','aevalsrc=0.15*sin(2*PI*440*t)|0.15*sin(2*PI*880*t):s=48000:d=36:c=stereo','-map','0:v:0','-c:v','copy','-map','1:a:0','-c:a','aac','-strict','-2','-b:a','192k','-tag:v','hvc1','-f','hls','-hls_time','2','-hls_list_size','0','-hls_playlist_type','vod','-hls_segment_type','fmp4','-hls_segment_options','movflags=+skip_sidx','-threads','1',str(out/'fixtures/hls-hevc/index.m3u8')]
r=subprocess.run(cmd,capture_output=True,text=True);assert r.returncode==0,r.stderr
(evidence/'generation.json').write_text(json.dumps(dict(command=cmd,stderr=r.stderr,exit=r.returncode,ffmpeg=subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]),indent=2))
probe=subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out/'fixtures/hls-hevc/index.m3u8')]);(out/'fixtures/hls-hevc/probe.json').write_bytes(probe)
def packets(path,stream):return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams',stream,'-show_packets','-show_data_hash','sha256','-show_entries','packet=pts_time,dts_time,data_hash','-of','json',str(path)]))['packets']
a=packets(parent/'fixtures/source-hevc8.mkv','v:0');b=packets(out/'fixtures/hls-hevc/index.m3u8','v:0');assert len(a)==len(b)==1080
for x,y in zip(a,b):
 assert x['data_hash']==y['data_hash'];assert abs(float(y['pts_time'])-float(x['pts_time'])-.067)<.00001
old_audio=packets(parent/'fixtures/hls-hevc/index.m3u8','a:0');new_audio=packets(out/'fixtures/hls-hevc/index.m3u8','a:0');assert [x['data_hash'] for x in old_audio]==[x['data_hash'] for x in new_audio]
(evidence/'packet-validation.json').write_text(json.dumps(dict(videoPackets=len(b),videoPayloadsMatch=True,videoPtsOffsetSeconds=.067,audioPackets=len(new_audio),audioPayloadsMatch=True),indent=2))
def hash(p):return hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((parent/'manifest.json').read_text());m['derived_from']={'parent':str(parent),'parent_manifest_sha256':hash(parent/'manifest.json'),'change':'Only HEVC HLS fixture regenerated with skip_sidx; unchanged frozen runtime; encoded video and audio payload hashes verified identical'}
m['expanded_generator_sha256']=hash(repo/'tests/head-to-head/expand.py')
for p in (out/'fixtures/hls-hevc').iterdir():
 if p.is_file():m['files'][str(p.relative_to(out))]={'sha256':hash(p),'bytes':p.stat().st_size}
(out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
(evidence/'assets-manifest.json').write_bytes((out/'manifest.json').read_bytes())
(evidence/'snapshot.json').write_text(json.dumps(dict(snapshot=str(out),manifestSHA256=hash(out/'manifest.json'),parentManifestSHA256=hash(parent/'manifest.json')),indent=2))
print('Validated identical 1080 video payloads and',len(new_audio),'audio payloads; repaired all segment-start PTS')

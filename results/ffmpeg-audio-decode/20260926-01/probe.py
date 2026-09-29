import subprocess,json,hashlib,re,statistics
from pathlib import Path
out=Path(__file__).resolve().parent
sources={'aac':Path('results/hevc-audio-path-comparison/fixtures/aac.mkv'),'ac3':Path('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv')}
result={'purpose':'Native FFmpeg software AAC versus AC3 decode to identical float PCM; no browser/mpv; diagnostic only','sources':{},'trials':[]}
(out/'ffmpeg-version.txt').write_text(subprocess.check_output(['ffmpeg','-version'],text=True))
for codec,p in sources.items():
 target=out/(codec+'.mka')
 subprocess.run(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c:a','copy',str(target)],check=True)
 result['sources'][codec]={'original':str(p),'originalSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'audioOnlySha256':hashlib.sha256(target.read_bytes()).hexdigest()}
 # Warm both decoder and filesystem once; excluded from timing.
 subprocess.run(['ffmpeg','-v','error','-c:a',codec,'-threads','1','-i',str(target),'-map','0:a:0','-c:a','pcm_f32le','-f','null','-'],check=True,stdout=subprocess.DEVNULL)
for n,codec in enumerate(['aac','ac3','ac3','aac','aac','ac3']):
 command=['ffmpeg','-hide_banner','-nostats','-benchmark','-progress','pipe:1','-stream_loop','99','-c:a',codec,'-threads','1','-i',str(out/(codec+'.mka')),'-map','0:a:0','-vn','-sn','-dn','-filter_threads','1','-c:a','pcm_f32le','-ar','48000','-ac','2','-f','null','-']
 run=subprocess.run(command,capture_output=True,text=True,check=True)
 (out/f'{n+1}-{codec}.log').write_text(run.stderr);(out/f'{n+1}-{codec}.progress').write_text(run.stdout)
 u,s,w=map(float,re.search(r'bench: utime=([\d.]+)s stime=([\d.]+)s rtime=([\d.]+)s',run.stderr).groups())
 seconds=int(re.findall(r'out_time_us=(\d+)',run.stdout)[-1])/1e6
 assert seconds>3500 and 'progress=end' in run.stdout
 t={'codec':codec,'command':command,'userSeconds':u,'systemSeconds':s,'wallSeconds':w,'mediaSeconds':seconds,'cpuMillisecondsPerMediaSecond':1000*(u+s)/seconds,'decodeSpeed':seconds/w}
 result['trials'].append(t);print(json.dumps(t),flush=True)
 (out/'result.json').write_text(json.dumps(result,indent=2))
result['medians']={c:statistics.median(t['cpuMillisecondsPerMediaSecond'] for t in result['trials'] if t['codec']==c) for c in sources}
(out/'result.json').write_text(json.dumps(result,indent=2));print('MEDIANS',result['medians'],flush=True)

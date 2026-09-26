# SPDX-License-Identifier: Apache-2.0
"""Original synthetic audio with distinct per-channel and temporal markers."""
import argparse,json,pathlib,subprocess,hashlib
p=argparse.ArgumentParser();p.add_argument('--out',required=True,type=pathlib.Path);p.add_argument('--cases');p.add_argument('--flac-bits',type=int,choices=[16,24,32]);a=p.parse_args();a.out.mkdir(parents=True,exist_ok=False)
video=pathlib.Path('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/source-hevc10.mkv')
# Same compressed native video across every fixture. No video encoding.
cases=[(c,c,48000,'stereo') for c in ['ac3','eac3','dca','truehd','aac','libmp3lame','libopus','vorbis','flac','alac','pcm_s16le','pcm_s24le','pcm_f32le']]
cases += [('aac-44100','aac',44100,'stereo'),('flac-96000','flac',96000,'stereo'),('ac3-mono','ac3',48000,'mono'),('eac3-51','eac3',48000,'5.1'),('truehd-51','truehd',48000,'5.1'),('flac-71','flac',48000,'7.1')]
result={'videoSource':str(video),'videoSourceSHA256':hashlib.sha256(video.read_bytes()).hexdigest(),'duration':18,'cases':[]}
for key,codec,rate,layout in cases:
 if a.cases and key not in a.cases.split(','):continue
 if codec=='flac' and a.flac_bits:key+=f'-bits{a.flac_bits}'
 n={'mono':1,'stereo':2,'5.1':6,'7.1':8}[layout];freqs=[440,880,1320,80,1760,2200,2640,3080][:n]
 expr='|'.join(f'0.1*sin(2*PI*({hz}'+('' if i==3 else '+110*gte(t,4)+110*gte(t,8)')+')*t)' for i,hz in enumerate(freqs))
 f=a.out/(key+'.mkv');cmd=['ffmpeg','-nostdin','-v','error','-i',str(video),'-f','lavfi','-i',f"aevalsrc='{expr}':s={rate}:d=18:c={layout}",'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a',codec,'-strict','-2','-t','18']
 if codec in ['ac3','eac3','aac','libopus','libmp3lame','vorbis']:cmd+=['-b:a','384k' if n>2 else '192k']
 if codec=='dca':cmd+=['-b:a','768k']
 if codec in ['flac','alac','truehd']:cmd+=['-sample_fmt','s32' if codec=='flac' else 's32p']
 if codec=='flac' and a.flac_bits:cmd+=['-bits_per_raw_sample',str(a.flac_bits)]
 cmd.append(str(f))
 row={'id':key,'file':str(f),'encoder':codec,'sampleRate':rate,'channels':n,'layoutRequested':layout,'frequencies':freqs,'command':cmd};result['cases'].append(row)
 run=subprocess.run(cmd,capture_output=True,text=True);row['returnCode']=run.returncode;row['stderr']=run.stderr
 if run.returncode==0:
  row['sha256']=hashlib.sha256(f.read_bytes()).hexdigest();row['probe']=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(f)]));print(key,'PREPARED',flush=True)
 else:print(key,'BLOCKED',run.stderr,flush=True)
 (a.out/'manifest.json').write_text(json.dumps(result,indent=2)+'\n')

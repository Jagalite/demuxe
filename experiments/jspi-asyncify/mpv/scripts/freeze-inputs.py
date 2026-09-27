#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Freeze the pthread reference and finite fixtures in a fresh directory."""
import argparse,hashlib,json,math,pathlib,shutil,struct,subprocess,wave
REPO=pathlib.Path(__file__).resolve().parents[4]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main(a):
    out=a.out.resolve();out.mkdir();(out/'baseline').mkdir();(out/'fixtures').mkdir();inputs={}
    def copy(src,name):
        dest=out/name;shutil.copyfile(src,dest);inputs[name]={'source':str(src),'sha256':sha(dest)}
    for name in ['service.mjs','service.wasm']:copy(a.baseline/name,'baseline/'+name)
    copy(a.manifest,'baseline/manifest.json')
    manifest=json.loads((out/'baseline/manifest.json').read_text())
    for name,wanted in manifest['artifacts'].items():
        if sha(out/'baseline'/name)!=wanted:raise ValueError('Baseline artifact mismatch')
    for name in ['m0.mkv','m0.ass']:copy(REPO/'fixtures'/name,'fixtures/'+name)
    copy(REPO/'fixtures/DejaVuSans.ttf','fixtures/font.ttf')
    (out/'inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
    fixtures=out/'fixtures';sub=fixtures/'replacement.srt'
    sub.write_text('1\n00:00:00,000 --> 00:00:02,000\nFirst replacement cue\n\n2\n00:00:02,000 --> 00:00:06,000\nSecond replacement cue\n')
    generated={'commands':[],'artifacts':{}}
    for file,codec in [('replacement.mkv','srt'),('movtext.mp4','mov_text')]:
        argv=['ffmpeg','-v','error','-i',str(fixtures/'m0.mkv'),'-i',str(sub),'-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s',codec,'-t','6',str(fixtures/file)]
        subprocess.run(argv,check=True);generated['commands'].append(argv);generated['artifacts'][file]=sha(fixtures/file)
    (out/'fixture-generation.json').write_text(json.dumps(generated,indent=2)+'\n')
    bitmap={}
    for kind in ['pgs','vobsub']:
        src=a.bitmaps/f'h264-aac-{kind}.mkv';dest=fixtures/(kind+'.mkv');shutil.copyfile(src,dest)
        bitmap[kind]={'original':str(src),'sha256':sha(dest)}
    (out/'bitmap-inputs.json').write_text(json.dumps(bitmap,indent=2)+'\n')
    for stem,frames,tones,amplitude,record in [('pcm',96000,[440,660],12000,'audio-inputs.json'),('replacement',24000,[880,220],8000,'audio-replacement-inputs.json')]:
        pcm=b''.join(struct.pack('<h',round(math.sin(i*hz*math.tau/48000)*amplitude)) for i in range(frames) for hz in tones)
        with wave.open(str(fixtures/(stem+'.wav')),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(48000);f.writeframes(pcm)
        (fixtures/(stem+'.s16')).write_bytes(pcm)
        (out/record).write_text(json.dumps({'recipe':{'rate':48000,'frames':frames,'tones':tones,'amplitude':amplitude,'formula':'round(sin(i * Hz * tau / 48000) * amplitude)'},'artifacts':{p.name:sha(p) for p in [fixtures/(stem+'.wav'),fixtures/(stem+'.s16')]}},indent=2)+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--baseline',type=pathlib.Path,required=True);p.add_argument('--manifest',type=pathlib.Path,required=True);p.add_argument('--bitmaps',type=pathlib.Path,required=True);main(p.parse_args())

# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,array,json
p=pathlib.Path(sys.argv[1]);commands=[]
def call(args):commands.append(args);return subprocess.check_output(args,stderr=subprocess.STDOUT)
raw=array.array('h');raw.frombytes(call(['ffmpeg','-v','error','-i',str(p/'source.flac'),'-f','s16le','-']));mono=array.array('h',((raw[i]+raw[i+1])//2 for i in range(0,len(raw),2)));(p/'reference.s16').write_bytes(mono.tobytes());call(['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','1','-i',str(p/'reference.s16'),'-c:a','flac',str(p/'reference.flac')]);test=call(['flac','-t',str(p/'source.flac'),str(p/'mono.flac')]);(p/'independent-flac-validation.txt').write_bytes(test)
with(p/'commands.log').open('a')as f:f.write('\n'.join(map(json.dumps,commands))+'\nnode research/shared/tooling/audio-stage-probes/flac_mid_browser.mjs '+str(p)+'\n')

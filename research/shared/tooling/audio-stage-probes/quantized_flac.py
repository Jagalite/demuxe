# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,array,math,sys,time,statistics
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);commands=[]
def call(a):commands.append(a);return subprocess.check_output(a,stderr=subprocess.DEVNULL)
protocol={'item':'R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder','policy':'Explicit research-only lossy float to signed24 round-nearest no dither, reject nonfinite or samples outside[-1,1-2^-23]; no normalization/clipping. Normal default AC3floatdecoder retained. Host quantization max<=0.5LSB, browser<=2LSB, exact normal-decoder frame count including AC3padding, integerFLACroundtrip exact','performance':'After correctness compare complete cold sourceAC3decode+quantize+FLACencode+browserdecode/render to same normalAC3decode+floatWAVbridge/browserrender;5alternatingpairs, candidate<=1.25baseline; size/error separate'};(p/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n')
call(['ffmpeg','-v','error','-y','-i','results/top100/audio/lossless.wav','-c:a','ac3','-b:a','192k',str(p/'source.ac3')])
def quant(a):
 if any(not math.isfinite(x) or x < -1 or x>1-2**-23 for x in a):raise ValueError('outofrange')
 return array.array('i',(round(x*8388608)*256 for x in a))
for x in [1.0001,-1.0001,float('nan'),float('inf')]:
 try:quant([x]);raise RuntimeError('accepted')
 except ValueError:pass
raw=call(['ffmpeg','-v','error','-i',str(p/'source.ac3'),'-f','f32le','-']);a=array.array('f');a.frombytes(raw);q=quant(a);(p/'normal.f32').write_bytes(raw);(p/'quant.s32').write_bytes(q.tobytes());call(['ffmpeg','-v','error','-y','-f','s32le','-ar','48000','-ac','2','-i',str(p/'quant.s32'),'-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24',str(p/'quant.flac')]);back=call(['ffmpeg','-v','error','-i',str(p/'quant.flac'),'-f','s32le','-']);assert back==q.tobytes();err=[x-y/2147483648 for x,y in zip(a,q)];r={'frames':len(a)//2,'maxError':max(map(abs,err)),'rmsError':math.sqrt(sum(e*e for e in err)/len(err)),'peak':max(map(abs,a)),'clipped':0,'outOfRangeRejected':True,'integerRoundtripExact':True,'floatBytes':len(raw),'flacBytes':(p/'quant.flac').stat().st_size};assert r['maxError']<=2**-24;(p/'host-correctness.json').write_text(json.dumps(r,indent=2)+'\n');(p/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print(r)

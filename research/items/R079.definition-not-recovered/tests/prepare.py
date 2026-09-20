# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,struct,math,random,json,subprocess,time
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
n=48000;r=random.Random(79);vals=[]
for i in range(n):
 for ch in range(2): vals.append(2.25*math.sin(i*.013*(ch+1))+.01*r.uniform(-1,1))
raw=b''.join(struct.pack('<f',v) for v in vals); words=list(struct.unpack('<'+'I'*(2*n),raw))
# Include both zero signs, subnormals, quiet NaNs and infinities in transport-only probe.
edge=[0,0x80000000,1,0x80000001,0x7f800000,0xff800000,0x7fc01234,0x3f800001]
(p/'source.f32').write_bytes(raw);(p/'edges.json').write_text(json.dumps(edge))
limbs=[]
for i in range(n):
 for ch in range(2):
  w=words[2*i+ch];limbs.extend([(w&65535)-32768,(w>>16)-32768])
(p/'limbs.s16').write_bytes(struct.pack('<'+'h'*len(limbs),*limbs))
commands=[['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','4','-i',str(p/'limbs.s16'),'-c:a','flac',str(p/'candidate.flac')],['ffmpeg','-v','error','-y','-f','f32le','-ar','48000','-ac','2','-i',str(p/'source.f32'),'-c:a','pcm_f32le',str(p/'baseline.wav')],['ffmpeg','-v','error','-y','-f','f32le','-ar','48000','-ac','2','-i',str(p/'source.f32'),'-c:a','flac',str(p/'ordinary.flac')]]
times=[]
for c in commands:
 t=time.perf_counter();subprocess.run(c,check=True,capture_output=True);times.append((time.perf_counter()-t)*1000)
(p/'preparation.json').write_text(json.dumps({'commands':commands,'preparation_ms':times,'frames':n,'bytes':{name:(p/name).stat().st_size for name in ['source.f32','candidate.flac','baseline.wav','ordinary.flac']}},indent=2))

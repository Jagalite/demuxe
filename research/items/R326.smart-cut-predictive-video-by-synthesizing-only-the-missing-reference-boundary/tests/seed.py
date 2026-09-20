# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys,re,hashlib,time,statistics
p=pathlib.Path(sys.argv[1]);cmds=[]
def run(c,allowed=False):
 cmds.append(c);r=subprocess.run(c,capture_output=True)
 if not allowed:assert r.returncode==0,r.stderr.decode()
 return r
enc=['-an','-c:v','mpeg2video','-bf','0','-g','36','-q:v','2','-pix_fmt','yuv420p','-f','mpeg2video']
run(['ffmpeg','-v','error','-f','lavfi','-i','color=red:s=640x360:r=12:d=3',*enc,str(p/'source.m2v')])
run(['ffmpeg','-v','error','-f','lavfi','-i','color=green:s=640x360:r=12:d=0.083334',*enc,'-frames:v','1',str(p/'wrong-seed.m2v')])
source=(p/'source.m2v').read_bytes();marks=list(re.finditer(b'\x00\x00\x01\x00',source));assert len(marks)==36
suffix=source[marks[10].start():]
def seedcmd(dst):return ['ffmpeg','-v','error','-i',str(p/'source.m2v'),'-vf','select=eq(n\\,9)','-fps_mode','passthrough','-frames:v','1',*enc,str(dst)]
def baselinecmd(dst):return ['ffmpeg','-v','error','-i',str(p/'source.m2v'),'-vf','select=gte(n\\,10)','-fps_mode','passthrough',*enc,str(dst)]
run(seedcmd(p/'seed.m2v'));run(baselinecmd(p/'baseline.m2v'))
def assemble(seed):
 # Emit sequence/GOP/seed headers and its slices, remove optional sequence_end before copied continuation; set synthetic picture temporal_reference to original9.
 b=bytearray(seed);i=b.index(b'\x00\x00\x01\x00')+4;word=int.from_bytes(b[i:i+2],'big');word=(word&0x3f)|(9<<6);b[i:i+2]=word.to_bytes(2,'big');b=bytes(b).removesuffix(b'\x00\x00\x01\xb7');return b+suffix
candidate=assemble((p/'seed.m2v').read_bytes());(p/'candidate.m2v').write_bytes(candidate);(p/'wrong-reference.m2v').write_bytes(assemble((p/'wrong-seed.m2v').read_bytes()));(p/'missing-reference.m2v').write_bytes(source[:marks[0].start()]+suffix)
def frames(file,start=0):
 r=run(['ffmpeg','-v','warning','-i',str(file),'-vf','select=gte(n\\,'+str(start)+')','-fps_mode','passthrough','-f','framemd5','-'],True);(p/(file.stem+'.decode.log')).write_bytes(r.stderr);(p/(file.stem+'.framemd5')).write_bytes(r.stdout);return [x.split(',')[-1].strip() for x in r.stdout.decode().splitlines() if x and not x.startswith('#')]
reference=frames(p/'source.m2v',10);got=frames(p/'candidate.m2v',1);base=frames(p/'baseline.m2v');wrong=frames(p/'wrong-reference.m2v',1);missing=frames(p/'missing-reference.m2v');assert len(reference)==26 and got==reference and base==reference;assert wrong!=reference and missing!=reference
headers=[]
for m in re.finditer(b'\x00\x00\x01\x00',candidate):
 w=int.from_bytes(candidate[m.end():m.end()+2],'big');headers.append({'temporal_reference':w>>6,'picture_type':w>>3&7})
assert [x['temporal_reference'] for x in headers]==list(range(9,36));assert [x['picture_type'] for x in headers]==[1]+[2]*26
(p/'contract.json').write_text(json.dumps({'scope':'MPEG2 noB constant640x360 blocks, one36picture GOP; cut atpicture10, synthetic exact reference picture9 is decoder pre-roll and deliberately not presented.','correctness_gate':'All26presented candidate/baseline pictures equal independent originalsource; entire copied suffix bytes untouched; temporal_reference9..35 and I/P verified; wrong/missing seed must differ.','performance_gate':{'metric':'Complete cold command preparation walltime including decode-prefix/encode-one/seed assembly vs decode-prefix/full26picture edge reencode','pairs':11,'order':'alternating','thresholdMedianSaving':.05},'limitations':['Host software component only, not browser native MPEG2','Caller must enforce seed nonpresentation','No arbitrary motion/quantization/reference equivalence claim']},indent=2))
# Run performance only after complete output correctness, including seed assembly and output write. No decoder cleanup deferred.
rows=[]
for i in range(11):
 row={'pair':i}
 for mode in (['candidate','baseline'] if i%2 else ['baseline','candidate']):
  dest=p/(mode+'-timed.m2v');start=time.perf_counter()
  if dest.exists():dest.unlink()
  if mode=='candidate':
   run(seedcmd(dest));(p/'candidate-assembled-timed.m2v').write_bytes(assemble(dest.read_bytes()))
  else:run(baselinecmd(dest))
  row[mode+'Ms']=(time.perf_counter()-start)*1000
 row['saving']=1-row['candidateMs']/row['baselineMs'];rows.append(row)
(p/'commands.json').write_text(json.dumps(cmds,indent=2));r={'sourcePictures':36,'copiedSuffixPictures':26,'referenceSeedPictures':1,'correct':True,'copiedSuffixSHA':hashlib.sha256(suffix).hexdigest(),'suffixBytes':len(suffix),'seedBytes':len(candidate)-len(suffix),'headers':headers,'wrongSeedFails':True,'missingSeedFails':True,'costs':rows,'medianSaving':statistics.median(x['saving'] for x in rows)};(p/'results.json').write_text(json.dumps(r,indent=2));print(r['medianSaving'])

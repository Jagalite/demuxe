# SPDX-License-Identifier: Apache-2.0
import pathlib,json,sys,subprocess,re,time,statistics,random,hashlib
p=pathlib.Path(sys.argv[1]);o=pathlib.Path(sys.argv[2]);source=(p/'source.m2v').read_bytes();marks=list(re.finditer(b'\x00\x00\x01\x00',source));suffix=source[marks[10].start():];enc=['-an','-c:v','mpeg2video','-bf','0','-g','36','-q:v','2','-pix_fmt','yuv420p','-f','mpeg2video']
ref=[x.split(',')[-1].strip() for x in (p/'source.framemd5').read_text().splitlines() if x and not x.startswith('#')];assert len(ref)==26
(o/'contract.json').write_text(json.dumps({'metric':'Cold complete preparation plus software decode and26wanted-frame hashes; candidate syntheticreference vs existingRAP packetcopy with10hidden preroll pictures','pairs':11,'order':'alternating','gateMedianSaving':.05,'reason':'RAP copy with hidden preroll is a cheaper faithful baseline than full edge reencode when caller already hides syntheticseed.'},indent=2))
cmds=[]
def run(c):
 cmds.append(c);r=subprocess.run(c,capture_output=True);assert r.returncode==0,r.stderr.decode();return r.stdout
rows=[]
for i in range(11):
 row={'pair':i}
 for mode in (['candidate','rap-copy'] if i%2 else ['rap-copy','candidate']):
  start=time.perf_counter();dest=o/(mode+'-'+str(i)+'.m2v')
  if mode=='candidate':
   seed=o/('seed-'+str(i)+'.m2v');run(['ffmpeg','-v','error','-i',str(p/'source.m2v'),'-vf','select=eq(n\\,9)','-fps_mode','passthrough','-frames:v','1',*enc,str(seed)]);b=bytearray(seed.read_bytes());pos=b.index(b'\x00\x00\x01\x00')+4;word=int.from_bytes(b[pos:pos+2],'big');b[pos:pos+2]=((word&0x3f)|(9<<6)).to_bytes(2,'big');dest.write_bytes(bytes(b).removesuffix(b'\x00\x00\x01\xb7')+suffix);skip=1
  else:dest.write_bytes(source);skip=10
  raw=run(['ffmpeg','-v','error','-i',str(dest),'-vf','select=gte(n\\,'+str(skip)+')','-fps_mode','passthrough','-f','framemd5','-']);hashes=[x.split(',')[-1].strip() for x in raw.decode().splitlines() if x and not x.startswith('#')];assert hashes==ref;elapsed=(time.perf_counter()-start)*1000;row[mode]={'ms':elapsed,'wantedPictures':len(hashes),'picturesExact':True,'fileBytes':dest.stat().st_size,'fileSHA':hashlib.sha256(dest.read_bytes()).hexdigest()}
 row['saving']=1-row['candidate']['ms']/row['rap-copy']['ms'];rows.append(row)
s=[r['saving'] for r in rows];rng=random.Random(326);boot=sorted(statistics.median(rng.choices(s,k=11)) for _ in range(10000));result={'rows':rows,'medianSaving':statistics.median(s),'bootstrap95':[boot[250],boot[9749]],'gate':.05,'passed':statistics.median(s)>=.05,'scope':'Host cold preparation plus actual software decoding/pre-roll/output consumption, no browser-native or amortized multi-play claim.'};(o/'results.json').write_text(json.dumps(result,indent=2));(o/'commands.json').write_text(json.dumps(cmds,indent=2));print({k:v for k,v in result.items() if k!='rows'})

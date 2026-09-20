# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,struct,os,time,hashlib
p=pathlib.Path(sys.argv[1]).resolve();p.mkdir(parents=True,exist_ok=True);commands=[]
def call(args):
 r=subprocess.run(args,capture_output=True);commands.append({'args':list(map(str,args)),'exit':r.returncode,'stderr':r.stderr.decode(errors='replace')});assert r.returncode==0,commands[-1];return r.stdout

def parse(raw):
 if raw[:2]!=b'\xff\xd8':raise ValueError('SOI')
 at=2;tables={};shape=None
 while True:
  if raw[at]!=255:raise ValueError('marker')
  marker=raw[at+1];size=int.from_bytes(raw[at+2:at+4],'big');data=raw[at+4:at+2+size];at+=2+size
  if marker==196:
   i=0
   while i<len(data):
    table=data[i];i+=1;counts=data[i:i+16];i+=16;n=sum(counts);values=data[i:i+n];i+=n
    if table not in[0,16]or len(values)!=n:raise ValueError('table')
    tables[table]=counts+values+b'\0'*(256-n)
  elif marker==192:
   if data[0]!=8 or data[5:]!=bytes([1,1,17,0]):raise ValueError('gray baseline')
   shape=struct.unpack('>HH',data[1:5])
  elif marker==218:
   if data!=bytes([1,1,0,0,63,0])or shape is None or set(tables)!={0,16}:raise ValueError('scan')
   if raw[-2:]!=b'\xff\xd9':raise ValueError('EOI')
   return {'height':shape[0],'width':shape[1],'blocks':((shape[0]+7)//8)*((shape[1]+7)//8)},tables[0]+tables[16],raw[at:-2]
  elif marker==221:raise ValueError('restart excluded')
  elif marker not in[219,224,254]:raise ValueError('other marker')
frames=[];table=None
for i in range(4):
 pixels=bytes(((x*17+y*23+x*y*(i+1)+i*19)%256)for y in range(128)for x in range(128));pgm=p/f'frame{i}.pgm';pgm.write_bytes(b'P5\n128 128\n255\n'+pixels);path=p/f'frame{i}.jpg';call(['/opt/homebrew/opt/jpeg-turbo/bin/cjpeg','-quality','83','-outfile',str(path),str(pgm)]);meta,t,entropy=parse(path.read_bytes());assert table is None or table==t;table=t;(p/f'frame{i}.entropy').write_bytes(entropy);coef=call([str(p/'oracle'),'c',str(path)]);(p/f'frame{i}.coeff').write_bytes(coef);decoded=call([str(p/'oracle'),'r',str(path),str(p/f'frame{i}.coeff')]);(p/f'frame{i}.gray').write_bytes(decoded);frames.append({**meta,'name':f'frame{i}','stuffedBytes':entropy.count(b'\xff\x00')})
(p/'tables.bin').write_bytes(table);fast=[]
for t in range(2):
 row=[0]*256;code=0;at=0
 for length,n in enumerate(table[t*272:t*272+16],1):
  for j in range(n):
   value=table[t*272+16+at];at+=1
   if length<=8:
    for k in range(1<<(8-length)):row[((code+j)<<(8-length))+k]=(length<<8)|value
  code=(code+n)<<1
 fast.append(row)
header='/* SPDX-License-Identifier: Apache-2.0 */\nstatic const unsigned char expected[544]={'+','.join(map(str,table))+'};\nstatic const unsigned short specialfast[2][256]={'+','.join('{'+','.join(map(str,row))+'}'for row in fast)+'};\n';(p/'tables.h').write_text(header)
# Changed optimized Huffman tables require validated generic fallback.
call(['/opt/homebrew/opt/jpeg-turbo/bin/cjpeg','-quality','83','-optimize','-outfile',str(p/'changed.jpg'),str(p/'frame0.pgm')]);meta,t,ent=parse((p/'changed.jpg').read_bytes());assert t!=table;(p/'changed.tables').write_bytes(t);(p/'changed.entropy').write_bytes(ent);(p/'changed.coeff').write_bytes(call([str(p/'oracle'),'c',str(p/'changed.jpg')]))
(p/'fixtures.json').write_text(json.dumps({'frames':frames,'changed':meta,'tableSHA256':hashlib.sha256(table).hexdigest()},indent=2));(p/'protocol.json').write_text(json.dumps({'scope':'Four actual128x128 baseline sequential grayscale JPEGs sharing standard validated Huffman tables. Original bounded C Wasm coefficient parser uses ordinary prederived8bit lookup+long-code fallback; specialization embeds validated immutable short-code lookup constants and retains generic long-code path. Source JPEG unchanged.','correctness':'Compare every quantized coefficient, entropy bits consumed and symbols across actual Wasm routes and independent libjpeg coefficients. Feed candidate coefficients through libjpeg same reconstruction to exact grayscale output. Stuffing/long codes/truncation/invalid tables/table change/restart rejection.','cost':'Five alternating four-frame jobs: candidate regenerate trusted constant header and compile specialized Wasm, then instantiate/setup/read/decode/return coefficients versus instantiate maintained general Wasm and derive lookup/setup/read/decode. Include first-use specialization cost;<=0.9 median. Warm throughput separate.'},indent=2));(p/'prepare-commands.json').write_text(json.dumps(commands,indent=2));print(frames)

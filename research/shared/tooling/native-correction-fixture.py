# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,struct,time,zlib,hashlib
p=pathlib.Path(sys.argv[1]);raw=pathlib.Path('research/shared/runs/20260919T231631Z-av1-reference-banks/a.yuv').read_bytes();(p/'source.yuv').write_bytes(raw)
def packets(b):
 a=32;r=[]
 while a<len(b):n,t=struct.unpack_from('<IQ',b,a);r.append(list(b[a+12:a+12+n]));a+=12+n
 return r
cases={};cost=[]
for pair in range(7):
 row={}
 for mode in (['base','lossless'] if pair%2 else ['lossless','base']):
  t=time.perf_counter();dest=p/f'{pair}-{mode}.ivf';r=subprocess.run(['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','yuv420p','-s','160x96','-r','24','-i',str(p/'source.yuv'),'-c:v','libaom-av1','-cpu-used','8','-lag-in-frames','0','-g','999','-crf','24' if mode=='base' else '0','-b:v','0','-y',str(dest)],capture_output=True,timeout=30);assert r.returncode==0,r.stderr;encoded=dest.read_bytes();r=subprocess.run(['ffmpeg','-v','error','-i',str(dest),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=15);assert len(r.stdout)==len(raw);recon=r.stdout
  if mode=='base':
   delta=struct.pack('<'+'h'*len(raw),*[a-b for a,b in zip(raw,recon)]);correction=zlib.compress(delta,6);(p/f'{pair}-correction.zlib').write_bytes(correction)
  else:assert recon==raw;correction=b''
  row[mode]=(time.perf_counter()-t)*1000
  if pair==0:cases[mode]={'packets':packets(encoded),'baseHashes':[hashlib.sha256(recon[i*23040:(i+1)*23040]).hexdigest() for i in range(3)],'correction':list(correction),'codedBytes':len(encoded)+len(correction)}
 cost.append(row)
(p/'input.json').write_text(json.dumps({'cases':cases,'oracleHashes':cases['lossless']['baseHashes'],'costMs':cost,'scope':'Prepared8bit I420 AV1 native base with source-bound signed16 corrections and integer GPU reconstruction; same-grid, no upsampling. Full-source bytes and reconstructed base hashes are authenticated local fixture identities, not a new network trust mechanism.'},indent=2)+'\n');print({'codedBytes':{k:v['codedBytes'] for k,v in cases.items()},'costMs':cost})

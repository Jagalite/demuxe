# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib,ast,struct
SOURCE=pathlib.Path('research/shared/runs/20260920T003439Z-huffman-special');p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);args=['/opt/homebrew/opt/jpeg-turbo/bin/cjpeg','-quality','83','-restart','4B','-outfile',str(p/'source.jpg'),str(SOURCE/'frame0.pgm')];subprocess.run(args,check=True);raw=(p/'source.jpg').read_bytes();at=2;modified=raw[:2];interval=None
while True:
 marker=raw[at+1];size=int.from_bytes(raw[at+2:at+4],'big');data=raw[at+4:at+2+size]
 if marker==221:interval=int.from_bytes(data,'big')
 else:modified+=raw[at:at+2+size]
 at+=2+size
 if marker==218:modified+=raw[at:];break
assert interval==4
# Reuse admitted baseline-header table parser after recording/removing DRI in memory only.
tree=ast.parse(pathlib.Path(__file__).with_name('huffman_prepare.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='parse'],type_ignores=[]),__file__,'exec'));meta,tables,entropy=parse(modified);chunks=[];start=0;i=0
while i<len(entropy):
 if entropy[i]==255:
  if i+1>=len(entropy):raise ValueError('stuffing')
  if entropy[i+1]==0:i+=2;continue
  if entropy[i+1]!=208+len(chunks)%8:raise ValueError('restart order')
  chunks.append(entropy[start:i]);i+=2;start=i;continue
 i+=1
chunks.append(entropy[start:]);assert len(chunks)==64;payload=b'';bounds=[]
for c in chunks:bounds.append([len(payload),len(payload)+len(c)]);payload+=c
(p/'entropy.bin').write_bytes(payload);(p/'bounds.json').write_text(json.dumps(bounds));(p/'tables.bin').write_bytes(tables);coef=subprocess.check_output([str(SOURCE/'oracle'),'c',str(p/'source.jpg')]);assert coef==(SOURCE/'frame0.coeff').read_bytes();(p/'reference.coeff').write_bytes(coef);(p/'protocol.json').write_text(json.dumps({'scope':'Actual baseline grayscale128x128JPEG with64 independently restarted entropy intervals,4blocks perinterval. GPU one invocation per interval, canonical Huffman8bit lookup and bounded16bit fallback, JPEG stuffing/sign extension/zigzag/DC reset, exact quantizedcoefficients.','cost':'Five alternating complete existing-browser input/table validation/read/index/GPU device/pipeline/upload/dispatch/readback/cleanup versus ordinary Wasm same interval coefficient decoder;<=0.9median. No CPU substitution for GPU candidate. No full GPU IDCT/presentation claim.'},indent=2));(p/'prepare-results.json').write_text(json.dumps({'blocks':256,'intervals':64,'blocksPerInterval':4,'stuffedBytes':payload.count(b'\xff\x00'),'sourceSHA256':hashlib.sha256(raw).hexdigest(),'command':args},indent=2));print(len(payload),len(chunks))

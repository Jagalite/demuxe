# SPDX-License-Identifier: Apache-2.0
import pathlib,ast,ctypes,struct,time,json,statistics,sys
out=pathlib.Path(sys.argv[1]);source=pathlib.Path('results/catalogue-current/opus/original.ogg');t=time.perf_counter();lib=ctypes.CDLL('/opt/homebrew/opt/opus/lib/libopus.dylib');lib.opus_repacketizer_create.restype=ctypes.c_void_p
for name,args in [('opus_repacketizer_destroy',[ctypes.c_void_p]),('opus_repacketizer_cat',[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_int]),('opus_repacketizer_out',[ctypes.c_void_p,ctypes.c_void_p,ctypes.c_int]),('opus_repacketizer_out_range',[ctypes.c_void_p,ctypes.c_int,ctypes.c_int,ctypes.c_void_p,ctypes.c_int])]:getattr(lib,name).argtypes=args
load=time.perf_counter()-t;tree=ast.parse(pathlib.Path('results/catalogue-current/opus/probe.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['group','crc','ogg']],type_ignores=[]),'<original-opus-helpers>','exec'))
def adapt(size):
 global header,tags,endgranule
 b=source.read_bytes();pos=0;packets=[];pending=b''
 while pos<len(b):
  n=b[pos+26];lace=b[pos+27:pos+27+n];offset=pos+27+n;endgranule=struct.unpack_from('<Q',b,pos+6)[0]
  for length in lace:
   pending+=b[offset:offset+length];offset+=length
   if length<255:packets.append(pending);pending=b''
  pos=offset
 assert not pending
 header,tags,*coded=packets;chunks=[coded[i:i+size] for i in range(0,len(coded),size)];return ogg([group(c) for c in chunks],[len(c) for c in chunks])
rows=[]
for pair in range(-1,5):
 for size in ([2,1] if pair%2 else [1,2]):
  t=time.perf_counter();b=adapt(size);(out/f'adapted-{size}.ogg').write_bytes(b);wall=time.perf_counter()-t;assert b==pathlib.Path(f'results/catalogue-current/opus/group-{size}.ogg').read_bytes();rows.append({'pair':pair,'framesPerPacket':size,'wallSeconds':wall,'bytes':len(b),'exactArchivedOutput':True})
d={'libLoadSeconds':load,'rows':rows,'mediansSeconds':{str(s):statistics.median(r['wallSeconds'] for r in rows if r['pair']>=0 and r['framesPerPacket']==s) for s in [1,2]},'scope':'Real parser, libopus grouping plus split verification, Python Ogg CRC/framing, source read/output write; warm process. Process startup excluded; dynamic library load recorded.'};(out/'adapter-cost.json').write_text(json.dumps(d,indent=2)+'\n');print(d['mediansSeconds'])

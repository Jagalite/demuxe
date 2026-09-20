# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,re,time,struct,hashlib
p=pathlib.Path(sys.argv[1]);src=pathlib.Path('research/shared/runs/20260919T231631Z-av1-reference-banks');data=json.loads((src/'input.json').read_text());packets=[bytes(x) for x in data['combined']];(p/'source.ivf').write_bytes((src/'combined.ivf').read_bytes());cost=[]
for i in range(7):
 t=time.perf_counter();r=subprocess.run(['ffmpeg','-v','verbose','-i',str(p/'source.ivf'),'-c','copy','-bsf:v','trace_headers','-f','null','-'],capture_output=True,timeout=15);assert r.returncode==0;trace=r.stderr.decode();cost.append((time.perf_counter()-t)*1000);(p/f'trace{i}.log').write_text(trace)
chunks=trace.split('Frame Header\n')[1:];assert len(chunks)==len(packets),(len(chunks),len(packets));slots=[None]*8;deps=[];output=[]
for n,c in enumerate(chunks):
 fs={name:int(num) for name,num in re.findall(r'\]\s+\d+\s+(\S+)\s+[01]+\s+=\s+(-?\d+)',c.split('Tile Group')[0])};refs=set();show=fs.get('show_existing_frame',0)
 if show:refs.add(slots[fs['frame_to_show_map_idx']])
 else:
  typ=fs['frame_type']
  if typ not in [0,2]:
   for k,v in fs.items():
    if k.startswith('ref_frame_idx['):refs.add(slots[v])
  flags=255 if typ==0 and fs.get('show_frame') else fs['refresh_frame_flags']
  for k in range(8):
   if flags>>k&1:slots[k]=n
 assert None not in refs;deps.append(sorted(refs))
 if show or fs.get('show_frame'):output.append(n)
target=output[-2] # A2 in final A1/B1/A2/B2 recall quartet.
keep={target};todo=[target]
while todo:
 for x in deps[todo.pop()]:
  if x not in keep:keep.add(x);todo.append(x)
keep=sorted(keep);assert keep==[0,1,2,target],keep
header=bytearray((src/'combined.ivf').read_bytes()[:32])
def write(name,ix):
 h=bytearray(header);struct.pack_into('<I',h,24,len(ix));(p/(name+'.ivf')).write_bytes(bytes(h)+b''.join(struct.pack('<IQ',len(packets[i]),i)+packets[i] for i in ix))
def decode(name):
 r=subprocess.run(['ffmpeg','-v','error','-i',str(p/(name+'.ivf')),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=15);(p/(name+'-decode.log')).write_bytes(r.stderr);return r.stdout
full=list(range(target+1));write('baseline',full);write('candidate',keep);write('wrong-missing-reference',[0,2,target]);oracle=(src/'a.yuv').read_bytes()[2*23040:3*23040];assert decode('baseline')[-23040:]==decode('candidate')[-23040:]==oracle;assert decode('wrong-missing-reference')[-23040:]!=oracle
cases=[]
for name,ix in [('baseline',full),('candidate',keep)]:
 expected=[data['expected'][output.index(i)] for i in ix if i in output];cases.append({'name':name,'originalPacketIndices':ix,'packets':[list(packets[i]) for i in ix],'expected':expected,'visiblePacketIndices':[j for j,i in enumerate(ix) if i in output],'bytes':sum(len(packets[i]) for i in ix)})
(p/'input.json').write_text(json.dumps({'cases':cases,'hashes':data['hashes'],'costMs':cost,'dependencies':deps,'selected':keep,'target':target,'sourceSha256':hashlib.sha256((p/'source.ivf').read_bytes()).hexdigest(),'passed':True,'scope':'Prepared same-profile AV1 exact header-level conservative reference closure; no order hint/frame IDs/grain and no arbitrary entropy-block slicing.'},indent=2)+'\n');print({'selected':keep,'prefixPackets':len(full),'costMs':cost})

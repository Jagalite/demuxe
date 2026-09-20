# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,re,hashlib,time,struct
p=pathlib.Path(sys.argv[1]);base=pathlib.Path(pathlib.Path('/tmp/demuxe-display-edit-run').read_text());data=json.loads((base/'input.json').read_text());ps=[bytes(x) for x in data['packets']['candidate']];source=(base/'candidate.ivf').read_bytes();(p/'source.ivf').write_bytes(source);identity=hashlib.sha256(source).hexdigest();cost=[]
for i in range(7):
 t=time.perf_counter();r=subprocess.run(['ffmpeg','-v','verbose','-i',str(p/'source.ivf'),'-c','copy','-bsf:v','trace_headers','-f','null','-'],capture_output=True,timeout=15);assert r.returncode==0;cost.append((time.perf_counter()-t)*1000);trace=r.stderr.decode();(p/f'trace{i}.log').write_text(trace)
fs=[{name:int(n) for name,n in re.findall(r'\]\s+\d+\s+(\S+)\s+[01]+\s+=\s+(-?\d+)',c.split('Tile Group')[0])} for c in trace.split('Frame Header\n')[1:]]
def choose(index,coverage,sourceid):
 if sourceid!=identity or coverage!={'fullFrame':True,'opaque':True,'tick':1}:raise ValueError('coverage/source contract')
 f=fs[index]
 if f.get('frame_type')!=2 or f.get('refresh_frame_flags')!=0 or f.get('error_resilient_mode')!=1:raise ValueError('reference/state eligibility')
 return [i for i in range(4) if i!=index]
keep=choose(2,{'fullFrame':True,'opaque':True,'tick':1},identity);assert keep==[0,1,3];controls={}
for name,ix,cov,sha in [('covered-reference',1,{'fullFrame':True,'opaque':True,'tick':1},identity),('partial-alpha',2,{'fullFrame':True,'opaque':False,'tick':1},identity),('partial-region',2,{'fullFrame':False,'opaque':True,'tick':1},identity),('wrong-source',2,{'fullFrame':True,'opaque':True,'tick':1},'bad')]:
 try:choose(ix,cov,sha);controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values());h=bytearray(source[:32]);struct.pack_into('<I',h,24,3);(p/'candidate.ivf').write_bytes(bytes(h)+b''.join(struct.pack('<IQ',len(ps[i]),i)+ps[i] for i in keep));r=subprocess.run(['ffmpeg','-v','error','-i',str(p/'candidate.ivf'),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=15);oracle=(base/'candidate.yuv').read_bytes();assert r.stdout==oracle[:23040]+oracle[46080:];(p/'candidate.yuv').write_bytes(r.stdout)
black=bytes([16])*15360+bytes([128])*7680;hashes=[data['hashes'][0],hashlib.sha256(black).hexdigest(),data['hashes'][2]]
(p/'input.json').write_text(json.dumps({'baseline':[list(x) for x in ps],'candidate':[list(ps[i]) for i in keep],'indices':{'baseline':[0,1,2,3],'candidate':keep},'hashes':hashes,'costMs':cost,'controls':controls,'scope':'Prepared AV1 intra-only no-refresh/error-resilient picture wholly covered at one declared tick by opaque full-frame content; reference-building hidden picture retained. No generic H264 entropy skipping or unknown compositor coverage.'},indent=2)+'\n');print(controls)

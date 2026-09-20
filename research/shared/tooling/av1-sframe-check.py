# SPDX-License-Identifier: Apache-2.0
import pathlib,struct,subprocess,json,hashlib,re,sys
p=pathlib.Path(sys.argv[1]);ps=[];raw=[]
def split(b):
 a=32;r=[]
 while a<len(b):n,t=struct.unpack_from('<IQ',b,a);r.append(b[a+12:a+12+n]);a+=12+n
 return r
def decode(name):
 r=subprocess.run(['ffmpeg','-v','error','-i',str(p/(name+'.ivf')),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=15);(p/(name+'-decode.log')).write_bytes(r.stderr);(p/(name+'.yuv')).write_bytes(r.stdout);return r.stdout
for i in range(4):ps.append(split((p/f'mode{i}.ivf').read_bytes()));raw.append(decode(f'mode{i}'))
assert all(len(x)==12 for x in ps);assert ps[0][:4]==ps[1][:4]==ps[2][:4]
header=(p/'mode0.ivf').read_bytes()[:32]
def write(name,packets):(p/(name+'.ivf')).write_bytes(header+b''.join(struct.pack('<IQ',len(b),i)+b for i,b in enumerate(packets)))
rows=[]
for target in [1,2]:
 packets=ps[0][:4]+ps[target][4:];name=f'switch{target}';write(name,packets);got=decode(name);assert got==raw[target]
 wrong=ps[3][:4]+ps[target][4:];write(f'wrong{target}',wrong);wr=decode(f'wrong{target}');rows.append({'target':target,'exact':True,'wrongHistoryDetected':wr!=raw[target],'bytes':sum(map(len,packets))})
frames=re.findall(r'frame_type\s+[01]+\s+=\s+(\d+)',(p/'trace1.log').read_text());assert frames[4]=='3',frames
hashes=[[hashlib.sha256(b[i*23040:(i+1)*23040]).hexdigest() for i in range(12)] for b in raw]
result={'packets':[[list(b) for b in x] for x in ps],'hashes':hashes,'rows':rows,'frameTypes':frames,'passed':True,'scope':'Identical first-four-picture history, same sequence/config, CQ24 to CQ40 at picture4; forced S-frame versus ordinary inter continuation. This does not test arbitrary history-independent switching.'};(p/'input.json').write_text(json.dumps(result,indent=2)+'\n');print(rows)

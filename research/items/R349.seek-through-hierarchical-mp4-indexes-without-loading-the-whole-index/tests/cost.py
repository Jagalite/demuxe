# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,struct,json,hashlib,time,statistics,random,sys
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T213400Z-hierarchy-cost';r.mkdir(exist_ok=False);source=r/'flat.mp4';cmd=['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=160x96:r=24:d=4','-c:v','libx264','-bf','0','-g','1','-movflags','frag_keyframe+empty_moov+default_base_moof',str(source)];subprocess.run(cmd,check=True);(r/'generator.json').write_text(json.dumps(cmd,indent=2)+'\n');b=source.read_bytes();parts=[];a=0
while a<len(b):
 n=int.from_bytes(b[a:a+4],'big');parts.append((b[a+4:a+8],a,n));a+=n
moofs=[(a,n) for t,a,n in parts if t==b'moof'];init=b[:moofs[0][0]];leaves=[b[a:a+n+int.from_bytes(b[a+n:a+n+4],'big')] for a,n in moofs];assert len(leaves)==96
sidx=lambda entries,t:struct.pack('>I4sIIIIIHH',32+12*len(entries),b'sidx',0,1,12288,t,0,0,len(entries))+b''.join(struct.pack('>III',(kind<<31)|n,d,0x90000000) for kind,n,d in entries)
children=[sidx([(0,len(x),512) for x in leaves[i:i+12]],i*512)+b''.join(leaves[i:i+12]) for i in range(0,96,12)];data=init+sidx([(1,len(c),6144) for c in children],0)+b''.join(children);(r/'hierarchy.mp4').write_bytes(data);identity=hashlib.sha256(data).hexdigest();root=len(init);queries=[20,3,21,3]
(r/'plan.json').write_text(json.dumps(dict(declared_before_correctness_and_sampling=True,source='Actual96sample changing all-intra AVC divided into8SIDX childgroups of12; oneimmutable twolevel version0 hierarchy.',workload='Four sparseoutoforder queries20,3,21,3, cold perbatch. Eager baseline loadsall8childindexes once thenqueries; candidate cachesroot plusonly visitedchildren, sourceidentity sharedchecked. Bothretrieve exactlysameleaf payloads and preservecaller initialization.',metric='11alternating pairs of100freshjobs: complete indexparse, sourceidentity comparison, lookup and sameleafbytecopy/hash. Median latency saving>=5percent AND retainedPython graph/indexmetadata>=20percentlower. Include coldroot+childreads; sharedmedia init/sourceacquisition commonexcluded. Alllogicalindexreads retained; notphysicalnetwork/memory.',controls='Everyquery leaf bytes/timing and fullpixels independently equal source; staleidentity,outofbounds and nestedunsupported reference rejects. No asyncremote reader orbrowser lifecycleclaim.'),indent=2)+'\n')
def parse(offset,log):
 size,typ=struct.unpack('>I4s',data[offset:offset+8]);log.append((offset,size))
 if typ!=b'sidx' or size<32 or offset+size>len(data):raise ValueError('indexbounds')
 v,track,scale,clock,off,res,count=struct.unpack('>IIIIIHH',data[offset+8:offset+32]);assert v==0 and scale==12288 and count<=96 and size==32+12*count
 pos=offset+size+off;out=[]
 for i in range(count):
  field,duration,sap=struct.unpack('>III',data[offset+32+12*i:offset+44+12*i]);n=field&0x7fffffff
  if not n or not duration or pos+n>len(data):raise ValueError('referencebounds')
  out.append((field>>31,pos,n,clock,duration));clock+=duration;pos+=n
 return out
def prepare(kind,version):
 if version!=identity:raise ValueError('identity')
 logs=[];rows=parse(root,logs);state=dict(kind=kind,root=rows,children={},logs=logs)
 if kind=='baseline':
  for parent in rows:
   children=parse(parent[1],logs)
   if parent[0]!=1 or any(c[0]!=0 or c[1]+c[2]>parent[1]+parent[2] for c in children):raise ValueError('hierarchycontract')
   state['children'][parent[1]]=children
 return state
def seek(s,i):
 if not 0<=i<96:raise ValueError('ordinal')
 t=i*512;parent=next(x for x in s['root'] if x[3]<=t<x[3]+x[4]);key=parent[1]
 if key not in s['children']:s['children'][key]=parse(key,s['logs'])
 child=next(x for x in s['children'][key] if x[3]<=t<x[3]+x[4])
 if parent[0]!=1 or child[0]!=0 or child[1]+child[2]>parent[1]+parent[2]:raise ValueError('hierarchycontract')
 return data[child[1]:child[1]+child[2]]
packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(source)]))['packets'];raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']);fb=160*96*3//2;checks=[]
for kind in ['baseline','candidate']:
 state=prepare(kind,identity)
 for i in queries:
  leaf=seek(state,i);assert leaf==leaves[i];file=r/f'{kind}-{i}.mp4';file.write_bytes(init+leaf);actual=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(file)]))['packets'];assert len(actual)==1 and all(actual[0][k]==packets[i][k] for k in ['pts','dts','duration','data_hash']);pixels=subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']);assert pixels==raw[i*fb:(i+1)*fb]
 checks.append(kind)
controls=[]
try:prepare('candidate','stale');raise AssertionError('identity')
except ValueError:controls.append('staleidentity')
original=data
for label,offset,value in [('outside',root+32,0xffffffff),('nested',root+128+32,0x80000000|len(leaves[0]))]:
 bad=bytearray(data);bad[offset:offset+4]=value.to_bytes(4,'big');data=bytes(bad)
 try:seek(prepare('candidate',identity),3);raise AssertionError(label)
 except ValueError:controls.append(label)
 finally:data=original
def graph(x,seen=None):
 seen=set() if seen is None else seen
 if id(x) in seen:return 0
 seen.add(id(x));n=sys.getsizeof(x)
 if isinstance(x,dict):return n+sum(graph(k,seen)+graph(v,seen) for k,v in x.items())
 if isinstance(x,(list,tuple)):return n+sum(graph(v,seen) for v in x)
 return n
retention={};logical={}
for kind in ['baseline','candidate']:
 s=prepare(kind,identity)
 for i in queries:seek(s,i)
 logical[kind]=dict(indexBytes=sum(n for _,n in s['logs']),indexReads=len(s['logs']));retention[kind]=graph(dict(root=s['root'],children=s['children']))
rows=[]
for pair in range(11):
 row={}
 for kind in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
  start=time.perf_counter_ns()
  for rep in range(100):
   s=prepare(kind,identity);digests=[hashlib.sha256(seek(s,i)).hexdigest() for i in queries]
  row[kind]=(time.perf_counter_ns()-start)/100;row[kind+'Digests']=digests
 assert row['baselineDigests']==row['candidateDigests'];row['saving']=1-row['candidate']/row['baseline'];rows.append(row)
xs=[x['saving'] for x in rows];random.seed(349);boots=sorted(statistics.median(random.choices(xs,k=11)) for _ in range(10000));median=statistics.median(xs);saving=1-retention['candidate']/retention['baseline'];result=dict(correctnessPassed=True,fullPixelOracle=checks,controls=controls,logicalIndexReads=logical,retainedPythonGraphBytes=retention,retentionSaving=saving,pairs=rows,medianSaving=median,bootstrap95Median=[boots[250],boots[9749]],performancePassed=median>=.05 and saving>=.20,scope='Pure finiteimmutable2levelSIDX metadata-and-leaf lookup with sourcebound caller. 8childsynthetic hierarchy; no remoteRange/browser/Wasm or physicalmemory/energy claim.')
(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='pairs'},indent=2))

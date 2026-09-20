# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib,sys
out=Path(sys.argv[1]);commands=[]
def run(c):commands.append(c);return subprocess.check_output(c)
def vint(b,p,tag=False):
 n=1
 while not b[p]&(128>>(n-1)):n+=1
 v=b[p] if tag else b[p]&((128>>(n-1))-1)
 for x in b[p+1:p+n]:v=v*256+x
 return v,p+n

def children(b,start=0,end=None):
 end=len(b) if end is None else end;rows=[]
 while start<end:
  tag,q=vint(b,start,True);n,r=vint(b,q);assert r+n<=end;rows.append((tag,start,r,r+n));start=r+n
 return rows

def elem(tag,b):
 t=tag.to_bytes((tag.bit_length()+7)//8,'big');n=next(n for n in range(1,9) if len(b)<(1<<(7*n))-1);return t+((1<<(7*n))|len(b)).to_bytes(n,'big')+b

def integer(tag,n):return elem(tag,n.to_bytes(max(1,(n.bit_length()+7)//8),'big'))
def get(b,tag):return next((b[s:e] for t,p,s,e in children(b) if t==tag),None)
for name,pattern,tone in [('a','testsrc2',440),('b','smptebars',880)]:
 (out/(name+'.srt')).write_text(f'1\n00:00:00,250 --> 00:00:00,750\n{name.upper()} first\n\n2\n00:00:01,250 --> 00:00:01,750\n{name.upper()} second\n')
 run(['ffmpeg','-v','error','-f','lavfi','-i',f'{pattern}=size=160x96:rate=24:duration=2','-f','lavfi','-i',f'sine=frequency={tone}:sample_rate=48000:duration=2','-i',str(out/(name+'.srt')),'-map','0:v','-map','1:a','-map','2:s','-c:v','libx264','-preset','ultrafast','-threads','2','-g','24','-bf','0','-c:a','pcm_s16le','-af','asetnsamples=n=2000:p=0','-c:s','srt',str(out/(name+'.mkv'))])
raw={n:(out/(n+'.mkv')).read_bytes() for n in ['a','b']};uids={};trackuids={}
for name,b in raw.items():
 seg=next(x for x in children(b) if x[0]==0x18538067);body=b[seg[2]:seg[3]];uids[name]=get(get(body,0x1549a966),0x73a4);tracks=get(body,0x1654ae6b);trackuids[name]=[{ 'number':int.from_bytes(get(tr,0xd7),'big'),'uid':int.from_bytes(get(tr,0x73c5),'big'),'type':int.from_bytes(get(tr,0x83),'big'),'codec':get(tr,0x86).decode()} for t,p,s,e in children(tracks) if t==0xae for tr in [tracks[s:e]]]
chapters=[]
for i,(name,end) in enumerate([('a',1),('b',2),('a',1)]):chapters.append(elem(0xb6,integer(0x73c4,i+1)+integer(0x91,0)+integer(0x92,end*1000000000)+elem(0x6e67,uids[name])))
chap=elem(0x1043a770,elem(0x45b9,integer(0x45bc,77)+integer(0x45db,1)+integer(0x45dd,1)+b''.join(chapters)))
b=raw['a'];tag,start,p,end=next(x for x in children(b) if x[0]==0x18538067);header=bytes.fromhex('18538067')+((1<<56)|(end-p+len(chap))).to_bytes(8,'big');assert len(header)==p-start;ordered=b[:start]+header+b[p:end]+chap;(out/'ordered.mkv').write_bytes(ordered)
authorized={uids[n].hex():{'name':n,'file':str(out/(n+'.mkv')),'sha256':hashlib.sha256(raw[n]).hexdigest(),'tracks':trackuids[n]} for n in ['a','b']}
def compile(b,auth):
 seg=next(x for x in children(b) if x[0]==0x18538067);ed=get(get(b[seg[2]:seg[3]],0x1043a770),0x45b9);assert int.from_bytes(get(ed,0x45bc),'big')==77 and get(ed,0x45dd)==b'\x01';rows=[];cursor=0
 for t,p,s,e in children(ed):
  if t!=0xb6:continue
  atom=ed[s:e];uid=get(atom,0x6e67).hex();assert uid in auth,'unauthorized linked SegmentUID';asset=auth[uid];assert hashlib.sha256(Path(asset['file']).read_bytes()).hexdigest()==asset['sha256'],'source identity';a=int.from_bytes(get(atom,0x91),'big');z=int.from_bytes(get(atom,0x92),'big');assert 0<=a<z<=2000000000,'chapter bounds';assert [(x['type'],x['codec']) for x in asset['tracks']]==[(1,'V_MPEG4/ISO/AVC'),(2,'A_PCM/INT/LIT'),(17,'S_TEXT/UTF8')],'selected track roles';rows.append({'uid':uid,'source':asset['file'],'startNS':a,'endNS':z,'virtualStartNS':cursor,'virtualEndNS':cursor+z-a,'trackMapping':asset['tracks']});cursor+=z-a
 return rows
mapping=compile(ordered,authorized);assert [(Path(x['source']).stem,x['startNS'],x['endNS'],x['virtualStartNS']) for x in mapping]==[('a',0,1000000000,0),('b',0,2000000000,1000000000),('a',0,1000000000,3000000000)]
controls={}
for mode in ['unauthorized','staleSource','wrongTrack']:
 auth=json.loads(json.dumps(authorized))
 if mode=='unauthorized':del auth[uids['b'].hex()]
 if mode=='staleSource':auth[uids['b'].hex()]['sha256']='00'*32
 if mode=='wrongTrack':auth[uids['b'].hex()]['tracks'][1]['codec']='A_AAC'
 try:compile(ordered,auth);raise RuntimeError('accepted')
 except AssertionError as e:controls[mode]=str(e)
script='ffconcat version 1.0\n'+''.join(f"file '{Path(x['source']).resolve()}'\ninpoint {x['startNS']/1e9}\noutpoint {x['endNS']/1e9}\nduration {(x['endNS']-x['startNS'])/1e9}\n" for x in mapping);(out/'edition.ffconcat').write_text(script);run(['ffmpeg','-v','error','-safe','0','-f','concat','-i',str(out/'edition.ffconcat'),'-map','0','-c','copy',str(out/'compiled.mkv')]);
def packets(p):return json.loads(run(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(p)]))['packets']
refs={n:packets(out/(n+'.mkv')) for n in ['a','b']};actual=packets(out/'compiled.mkv');expect=[]
for r in mapping:
 n=Path(r['source']).stem
 for p in refs[n]:
  if r['startNS']/1e9<=float(p['pts_time'])<r['endNS']/1e9:expect.append({'stream':p['stream_index'],'ptsMS':round(float(p['pts_time'])*1000+r['virtualStartNS']/1e6),'hash':p['data_hash']})
got=[{'stream':p['stream_index'],'ptsMS':round(float(p['pts_time'])*1000),'hash':p['data_hash']} for p in actual];key=lambda x:(x['stream'],x['ptsMS'],x['hash']);exact=sorted(expect,key=key)==sorted(got,key=key)
(out/'result.json').write_text(json.dumps({'mapping':mapping,'authorized':authorized,'controls':controls,'expectedPackets':expect,'actualPackets':got,'packetTimelineExact':exact,'commands':commands},indent=2));print({'packetTimelineExact':exact,'expected':len(expect),'actual':len(got)})

# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys,hashlib
h=pathlib.Path(__file__).resolve().parents[1];p=pathlib.Path(sys.argv[1]);commands=[]
def run(c,log=None):
 commands.append(c);r=subprocess.run(c,capture_output=True);assert r.returncode==0,r.stderr.decode()
 if log:(p/log).write_bytes(r.stderr)
 return r.stdout
run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=160x96:r=12:d=3','-c:v','libx264','-g','12','-keyint_min','12','-sc_threshold','0','-bf','1','-b_strategy','0','-refs','1','-pix_fmt','yuv420p',str(p/'source.mp4')])
pack=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-of','json',str(p/'source.mp4')]))['packets'];frames=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-of','json',str(p/'source.mp4')]))['frames'];bypts={int(f['pts']):f['pict_type'] for f in frames};data=(p/'source.mp4').read_bytes();nal=[]
for j,k in enumerate(pack):
 b=data[int(k['pos']):int(k['pos'])+int(k['size'])];at=0;sl=[]
 while at<len(b):
  n=int.from_bytes(b[at:at+4],'big');header=b[at+4];at+=4+n
  if header&31 in [1,5]:sl.append({'type':header&31,'ref':header>>5&3})
 assert sl;nal.append({'ordinal':j,'pts':int(k['pts']),'pts_time':float(k['pts_time']),'picture':bypts[int(k['pts'])],'slices':sl})
nonref=next(x for x in nal if x['picture']=='B' and x['pts_time']>.2 and all(n['ref']==0 for n in x['slices']));ref=next(x for x in nal if x['picture']=='P' and x['pts_time']>.2 and all(n['ref']>0 for n in x['slices']));reset=next(x for x in nal if x['pts_time']>ref['pts_time'] and all(n['type']==5 for n in x['slices']))
run(['cc',str(h/'tests/perturb.c'),'-o',str(p/'perturb')]+subprocess.check_output(['pkg-config','--cflags','--libs','libavformat','libavcodec','libavutil'],text=True).split())
for name,target,mode in [('nonreference-loss',nonref,0),('reference-loss',ref,0),('malformed-reference',ref,1)]:run([str(p/'perturb'),str(p/'source.mp4'),str(p/(name+'.mp4')),str(target['ordinal']),str(mode)])
def hashes(name):
 text=run(['ffmpeg','-v','warning','-copyts','-i',str(p/(name+'.mp4')),'-fps_mode','passthrough','-f','framemd5','-'],name+'-decode.log').decode();(p/(name+'.framemd5')).write_text(text);tb=next(l.split()[-1] for l in text.splitlines() if l.startswith('#tb'));n,d=map(int,tb.split('/'));return {round(int(v[2])*n/d,8):v[-1].strip() for l in text.splitlines() if not l.startswith('#') for v in [l.split(',')]}
base=hashes('source');results=[]
for name,target in [('nonreference-loss',nonref),('reference-loss',ref),('malformed-reference',ref)]:
 got=hashes(name);missing=sorted(set(base)-set(got));changed=[t for t in base.keys()&got.keys() if base[t]!=got[t]];affected=[x['pts_time'] for x in nal if target['ordinal']<=x['ordinal']<reset['ordinal']];unknown=lambda t:abs(t-target['pts_time'])<1e-5 if name=='nonreference-loss' else any(abs(t-u)<1e-5 for u in affected)
 unexpected=[t for t in missing+changed if not unknown(t)];clear=[t for t in base if not unknown(t)];exact=all(got.get(t)==base[t] for t in clear)
 if name=='nonreference-loss':assert len(got)==35 and not changed and len(missing)==1
 assert not unexpected and exact,(name,unexpected,changed,missing)
 results.append({'case':name,'target':target,'decoded':len(got),'missingTimes':missing,'changedTimes':changed,'unknownTimes':[t for t in base if unknown(t)],'clearExact':exact,'nextReset':reset['pts_time'],'rejectFalselyClearingAfterLostPicture':any(t>target['pts_time']+1e-5 for t in changed) if name!='nonreference-loss' else None})
(p/'results.json').write_text(json.dumps({'types':{k:sum(f['pict_type']==k for f in frames) for k in ['I','P','B']},'nalProof':nal,'cases':results,'sourceSha256':hashlib.sha256(data).hexdigest(),'scope':'Conservative whole presentation trust, no per-picture general prediction graph; bitstream-known nonreference loss vs any reference/control uncertainty until independently parsed IDR.','performance':'N/A fidelity/trust semantics; no skipping decoder work or concealment quality claim.'},indent=2));(p/'commands.json').write_text(json.dumps(commands,indent=2));print(json.dumps(results,indent=2))

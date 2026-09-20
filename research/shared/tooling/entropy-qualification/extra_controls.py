# SPDX-License-Identifier: Apache-2.0
"""Complete grammar checkpoint boundary and interrupted publication controls."""
import pathlib,sys,subprocess,os,time,json,hashlib
out=pathlib.Path(sys.argv[1]).resolve();b=str(pathlib.Path(sys.argv[2]).resolve());base=out/'qualification/motion-mid';d=out/'extra-controls';d.mkdir(exist_ok=True);logs=[]
def run(src,dst,cp,mode,mb):
 env={'DEMUXE_CP_DIR':str(cp),'DEMUXE_CP_MODE':mode,'DEMUXE_CP_MB':str(mb)};args=[b,str(src),str(dst)];p=subprocess.run(args,env=dict(os.environ,**env),capture_output=True,text=True);logs.append({'command':args,'env':env,'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr});assert p.returncode==0,p.stderr;return p
results=[]
for boundary in [1,47,95]:
 cp=d/f'boundary-{boundary}';run(base/'input.h264',d/f'capture-{boundary}.h264',cp,'capture',boundary);p=run(base/'input.h264',d/f'restore-{boundary}.h264',cp,'restore',boundary);assert (d/f'restore-{boundary}.h264').read_bytes()==(base/'translated.h264').read_bytes();assert p.stderr.count('RESTORE source=')==24;results.append({'boundary':boundary,'slices':24,'complete_stream_exact':True,'retained_bytes':sum(x.stat().st_size for x in cp.glob('*.json'))})
cp=d/'interrupted';cp.mkdir(exist_ok=True);args=[b,str(base/'input.h264'),str(d/'interrupted.h264')];env={'DEMUXE_CP_DIR':str(cp),'DEMUXE_CP_MODE':'capture'};p=subprocess.Popen(args,env=dict(os.environ,**env),stdout=subprocess.PIPE,stderr=subprocess.PIPE);deadline=time.monotonic()+10
while not list(cp.glob('*.json')) and p.poll() is None and time.monotonic()<deadline:time.sleep(.0005)
if p.poll() is None:p.terminate()
a,e=p.communicate();files=list(cp.glob('*.json'));assert 0<len(files)<24 and p.returncode!=0,(len(files),p.returncode)
for path in files:
 v=json.loads(path.read_text());assert hashlib.sha256(v['payload'].encode()).hexdigest()==v['sha256']
run(base/'input.h264',d/'recovered.h264',cp,'capture',48);run(base/'input.h264',d/'recovered-restore.h264',cp,'restore',48);assert (d/'recovered-restore.h264').read_bytes()==(base/'translated.h264').read_bytes()
record={'boundaries':results,'interrupted_capture':{'exit':p.returncode,'completed_valid_records':len(files),'candidate_output_published':(d/'interrupted.h264').exists(),'recovery_exact':True},'commands':logs};(d/'results.json').write_text(json.dumps(record,indent=2));print(json.dumps({k:v for k,v in record.items()if k!='commands'},indent=2))

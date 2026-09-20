# SPDX-License-Identifier: Apache-2.0
"""Recreate isolated pinned source and results in NEW paths; never overwrite evidence."""
import pathlib,sys,subprocess,json,time
repo=pathlib.Path(sys.argv[1]).resolve();out=pathlib.Path(sys.argv[2]).resolve();tools=pathlib.Path(__file__).resolve().parent
assert not repo.exists() and not out.exists(),'Use fresh checkout/output paths'
out.mkdir(parents=True);logs=[]
def run(cmd):
 t=time.perf_counter();p=subprocess.run(cmd,capture_output=True,text=True);logs.append({'command':cmd,'exit':p.returncode,'wall_seconds':time.perf_counter()-t,'stdout':p.stdout,'stderr':p.stderr});(out/'setup-results.json').write_text(json.dumps(logs,indent=2));assert p.returncode==0,p.stderr
run(['git','clone','https://github.com/OxideAV/oxideav-h264.git',str(repo)])
run(['git','-C',str(repo),'checkout','--detach','552f9883f6dc5bbdf69441063e65e9cb27af614b'])
(repo/'Cargo.lock').write_bytes((tools/'Cargo.lock').read_bytes())
run([sys.executable,str(tools/'build.py'),str(repo)])
run([sys.executable,str(tools/'qualify.py'),str(out/'qualification'),str(repo/'target/release/research_entropy')])
run([sys.executable,str(tools/'extra_controls.py'),str(out),str(repo/'target/release/research_entropy')])

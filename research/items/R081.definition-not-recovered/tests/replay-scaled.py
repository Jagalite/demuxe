# SPDX-License-Identifier: Apache-2.0
"""Recreate scaled actual compressed decoder experiment in a fresh directory.
GPU/cost tests require a quiet browser/GPU/CPU window.
"""
import pathlib,sys,subprocess,time,json
p=pathlib.Path(sys.argv[1]);assert not p.exists(),'Use a new output directory';p.mkdir(parents=True);tool=pathlib.Path(__file__).parent;rows=[]
for command in [[sys.executable,str(tool/'prepare-scaled.py'),str(p/'256'),'256'],[sys.executable,str(tool/'prepare-scaled.py'),str(p/'512'),'512'],['node',str(tool/'qualify-scaled.mjs'),str(p)]]:
 start=time.perf_counter();r=subprocess.run(command,capture_output=True,text=True);rows.append({'command':command,'exit':r.returncode,'wallSeconds':time.perf_counter()-start,'stdout':r.stdout,'stderr':r.stderr});(p/'execution.json').write_text(json.dumps(rows,indent=2));assert r.returncode==0,r.stderr

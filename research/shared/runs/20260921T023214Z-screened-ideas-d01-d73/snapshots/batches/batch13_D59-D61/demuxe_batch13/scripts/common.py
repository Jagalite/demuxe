# SPDX-License-Identifier: MIT
from pathlib import Path
import json,hashlib,subprocess
R=Path(__file__).resolve().parents[1]; F=R/'fixtures'; E=R/'evidence'
F.mkdir(exist_ok=True);E.mkdir(exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def save(n,o):(E/n).write_text(json.dumps(o,indent=2))
def run(args,check=True):
 p=subprocess.run([str(a) for a in args],capture_output=True,timeout=35)
 with (E/'commands.jsonl').open('a') as f:f.write(json.dumps({'argv':[str(a) for a in args],'code':p.returncode,'stderr':p.stderr.decode(errors='replace'),'stdout_bytes':len(p.stdout),'stdout_sha256':sha(p.stdout)})+'\n')
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p

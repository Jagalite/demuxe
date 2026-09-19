#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Save immutable review patches and hashes without changing refs or the index."""
import argparse,pathlib,subprocess,hashlib,json
root=pathlib.Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--evidence',type=pathlib.Path,nargs='+',required=True);p.add_argument('--engine',type=pathlib.Path,required=True);p.add_argument('--package-dir',type=pathlib.Path,required=True);p.add_argument('--baseline',type=pathlib.Path);args=p.parse_args()
out=args.output.resolve()
if out.exists():raise SystemExit('Checkpoint output must be new; existing checkpoints are immutable')
out.mkdir(parents=True)
patch=subprocess.check_output(['git','diff','--binary','HEAD'],cwd=root)
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','docs','src','web/generated','native/adaptation','native/subtitles','web/native-ass-worker.js','scripts','tests','experiments/optimization-integration'],cwd=root,text=True).splitlines()
untracked=[name for name in untracked if '__pycache__' not in name]
for name in untracked:
 result=subprocess.run(['git','diff','--no-index','--binary','--','/dev/null',name],cwd=root,stdout=subprocess.PIPE)
 assert result.returncode in [0,1],name
 patch+=result.stdout
(out/'integration.patch').write_bytes(patch)
inputs=set(subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=root,text=True).splitlines())|set(untracked)
inputs={name for name in inputs if (root/name).is_file()}
if args.baseline:
 delta=b''
 for name in sorted(inputs):
  old=args.baseline.resolve()/name
  result=subprocess.run(['git','diff','--no-index','--binary','--',str(old) if old.exists() else '/dev/null',name],cwd=root,stdout=subprocess.PIPE)
  assert result.returncode in [0,1],name
  chunk=result.stdout
  if old.exists():chunk=chunk.replace(('a/'+str(old).lstrip('/')).encode(),('a/'+name).encode())
  delta+=chunk
 (out/'review-fixes.patch').write_bytes(delta)
for directory in [*args.evidence,args.engine,args.package_dir,out]:
 inputs.update(str(f.resolve().relative_to(root)) for f in directory.rglob('*') if f.is_file() and f.name not in ['artifact-hashes.json','SHA256SUMS'])
record={name:{'bytes':(root/name).stat().st_size,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()} for name in sorted(inputs)}
(out/'artifact-hashes.json').write_text(json.dumps(record,indent=2)+'\n')
(out/'SHA256SUMS').write_text(''.join(f"{v['sha256']}  {k}\n" for k,v in record.items()))
print(f'Saved {len(patch)} patch bytes and {len(record)} artifact hashes; no git mutations')

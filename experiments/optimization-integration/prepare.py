#!/usr/bin/env python3
"""Apply the optimization delta after assembling the protected streaming checkpoint.
No engines are reused here: this creates source requiring its own build/qualification.
"""
import argparse, hashlib, json, pathlib, subprocess, tarfile, os, re
root=pathlib.Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--output',required=True,type=pathlib.Path);p.add_argument('--checkpoint',type=pathlib.Path);args=p.parse_args()
out=args.output.resolve()
if out.exists():raise SystemExit('Output must be new')
out.mkdir(parents=True)
checkpoint='f2491f62c777fa55225aed9b0b7ecf2e340accf7'
base=args.checkpoint.resolve() if args.checkpoint else out/'checkpoint'
if not args.checkpoint:
 subprocess.run(['git','clone','--shared','--no-checkout',str(root),str(base)],check=True)
 subprocess.run(['git','checkout','--detach',checkpoint],cwd=base,check=True)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=base,text=True).strip()==checkpoint
assert not subprocess.check_output(['git','status','--porcelain'],cwd=base,text=True).strip(), 'Checkpoint must be clean'

prepared=out/'streaming'
subprocess.run(['python3',str(base/'experiments/streaming-modernization/prepare.py'),'--timeline','--output',str(prepared)],cwd=base,check=True)
paths=['src/internal/errors.ts','src/internal/selection.ts','web/source-probe.js','web/retained-decoder-worker.js','src/internal/wasm-player.ts','src/internal/state.ts','src/types.ts','src/unified-player.ts','src/internal/backend.ts','src/internal/native-player.ts','web/native-remux-player.js','web/native-remux-worker.js','native/remux/remux.c']
patch=subprocess.check_output(['git','diff',checkpoint,'--',*paths],cwd=root)
(out/'optimization.patch').write_bytes(patch)
# Three-way source merge preserves the saved overlay's quality/lifecycle changes.
# Only the four reviewed additive conflicts have explicit resolutions.
merges=[]
for name in paths:
 ancestor=out/('base-'+name.replace('/','_'))
 ancestor.write_bytes(subprocess.check_output(['git','show',checkpoint+':'+name],cwd=root))
 target=prepared/name
 run=subprocess.run(['git','merge-file','-p','--diff3',str(target),str(ancestor),str(root/name)],capture_output=True)
 if run.returncode<0 or run.returncode>=128:raise SystemExit(run.stderr.decode())
 content=run.stdout.decode();resolutions=[]
 def resolve_conflict(match):
  staged,base,ours=match.groups()
  if not base.strip() and ((staged.startswith('import ') and ours.startswith('import ')) or ('private streamingRecoveries=' in staged and 'private audioAdaptation' in ours)):
   resolutions.append('combine independent additions');return staged+ours
  if staged.startswith('export type FeatureName = ') and "'quality'" in staged and "'audioGain'" in ours:
   resolutions.append('preserve quality and add audioGain');return staged.replace(";", " | 'audioGain';")
  if 'return redact({mode:' in staged and 'streamingRecovery:' in staged and 'executionPlan(' in ours:
   resolutions.append('preserve streaming recovery diagnostics and add execution plan')
   return ours[:ours.index('backend:')]+staged[staged.index('backend:'):]
  if "source.options.streaming?.qualityPolicy" in staged and ours=='    this.losslessInspection=undefined;\n'+base:
   resolutions.append('preserve persistent streaming quality routing and reset file-only adaptation inspection')
   return '    this.losslessInspection=undefined;\n'+staged
  (out/('conflict-'+name.replace('/','_'))).write_text(content)
  raise SystemExit('Unreviewed merge conflict: '+name)
 content=re.sub(r'^<<<<<<< [^\n]*\n(.*?)^\|\|\|\|\|\|\| [^\n]*\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]*\n',resolve_conflict,content,flags=re.M|re.S)
 assert '<<<<<<<' not in content,name
 target.write_text(content);merges.append({'path':name,'resolutions':resolutions,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
assert 'rm_adapt_audio' in (prepared/'native/remux/remux.c').read_text()
assert 'experimentalAudioAdaptation' in (prepared/'src/types.ts').read_text()
(out/'merges.json').write_text(json.dumps(merges,indent=2)+'\n')
for name in ['web/split-mp4.js','src/internal/native-ass.ts','web/native-ass-worker.js','native/subtitles/ass.c','scripts/link-native-ass.py','src/internal/playback-plans.ts','native/adaptation/flac.h','scripts/build-audio-adaptation.py']:
 (prepared/name).parent.mkdir(parents=True,exist_ok=True)
 (prepared/name).write_bytes((root/name).read_bytes())
(out/'assembly.json').write_text(json.dumps({'checkpoint':checkpoint,'patchSHA256':hashlib.sha256(patch).hexdigest(),'status':'source-only; build and qualification required'},indent=2)+'\n')

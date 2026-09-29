#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Build raw-Wasm JSPI and actual Binaryen-Asyncify infrastructure fixtures."""
import argparse,datetime,hashlib,json,os,pathlib,shutil,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--wasm-opt',type=pathlib.Path,required=True);a=p.parse_args()
exe=a.wasm_opt.resolve()
if not exe.is_file():p.error('wasm-opt does not exist')
env=dict(os.environ);lib=exe.parent.parent/'lib'
if lib.is_dir():env['LD_LIBRARY_PATH']=str(lib)+os.pathsep+env.get('LD_LIBRARY_PATH','')
commands=[]
def run(args):
 args=list(map(str,args));proc=subprocess.run(args,cwd=ROOT,env=env,capture_output=True,text=True)
 commands.append({'argv':args,'returncode':proc.returncode,'stdout':proc.stdout,'stderr':proc.stderr})
 if proc.returncode:raise RuntimeError(proc.stderr or proc.stdout)
 return proc.stdout.strip()
record={'scope':'Infrastructure fixtures, not a complete Emscripten/libmpv/FFmpeg build','recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commands':commands}
try:
 record['binaryen']=run([exe,'--version']);record['wasmOptSHA256']=hashlib.sha256(exe.read_bytes()).hexdigest()
 record['clang']=run([os.environ.get('CLANG','clang'),'--version'])
 run(['bash','build-unit.sh']);run(['bash','stage2/scripts/build-bridge.sh'])
 for src,dest,io in [('artifacts/mpv-coop-units.wasm','artifacts/mpv-coop-units.asyncify.wasm','test.read'),('stage2/artifacts/range-bridge.wasm','artifacts/range-bridge.asyncify.wasm','demuxe_source.read')]:
  run([exe,src,'--asyncify','--pass-arg=asyncify-imports@demuxe_coop.wait,demuxe_coop.join,demuxe_coop.yield,'+io,'--enable-bulk-memory','-g','-o',dest])
 run([sys.executable,'-B','review/build-probes.py','--wasm-opt',exe])
 audits={}
 for file in sorted([*ROOT.glob('artifacts/*.wasm'),*ROOT.glob('stage2/artifacts/*.wasm')]):
  args=['node','scripts/audit-wasm.mjs',file]
  if '.asyncify.' in file.name:args.append('--asyncify')
  audits[str(file.relative_to(ROOT))]=json.loads(run(args))
 record['audits']=audits
 record['sourceSHA256']={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [
  ROOT/'runtime/threads-coop.c',ROOT/'runtime/threads-coop.h',ROOT/'runtime/asyncify-stacks.c',ROOT/'runtime/stack.s',
  ROOT/'tests/probe.c',ROOT/'tests/support.c',ROOT/'stage2/native/stream-coop.c',ROOT/'stage2/tests/bridge-probe.c',
  ROOT/'review/tests/continuation-probe.c',ROOT/'build-unit.sh',ROOT/'stage2/scripts/build-bridge.sh',
  ROOT/'scripts/build-dual.py',ROOT/'review/build-probes.py',ROOT/'scripts/audit-wasm.mjs']}
 record['status']='built'
 record['artifacts']={str(f.relative_to(ROOT)):{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted([*ROOT.glob('artifacts/*.wasm'),*ROOT.glob('stage2/artifacts/*.wasm')])}
except Exception as error:record['status']='failed';record['error']=str(error)
finally:(ROOT/'results/build.json').write_text(json.dumps(record,indent=2)+'\n')
if record['status']!='built':raise SystemExit(record['error'])
print(record['binaryen']);print('Built and audited nine infrastructure binaries; no media executed.')

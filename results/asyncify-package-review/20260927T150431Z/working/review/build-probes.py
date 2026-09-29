#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Build positive and deliberately broken continuation fixtures; never service assets."""
import argparse,datetime,hashlib,json,os,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
EXPORTS=['demuxe_coop_invoke','demuxe_coop_get_sp','demuxe_coop_set_sp','demuxe_coop_stack_base',
'demuxe_coop_stack_top','demuxe_coop_stack_count','demuxe_asyncify_data','demuxe_asyncify_base',
'demuxe_asyncify_end','demuxe_asyncify_count','probe_no_suspend','probe_once','probe_recursive',
'probe_indirect','probe_entered','probe_after','probe_finished','probe_trap']
ARTIFACTS=['continuation-probe.wasm','continuation-probe-small.wasm','continuation-probe.asyncify.wasm',
'continuation-probe-small.asyncify.wasm','continuation-probe-omitted-import.asyncify.wasm']
def main(a):
 exe=a.wasm_opt.resolve()
 if not exe.is_file():raise ValueError('wasm-opt missing')
 env=dict(os.environ);lib=exe.parent.parent/'lib'
 if lib.is_dir():env['LD_LIBRARY_PATH']=str(lib)+os.pathsep+env.get('LD_LIBRARY_PATH','')
 record={'scope':'Additional infrastructure fixtures; small/omitted-import variants are deliberate negative inputs',
  'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commands':[]}
 def run(args):
  args=list(map(str,args));p=subprocess.run(args,cwd=ROOT,env=env,capture_output=True,text=True)
  record['commands'].append({'argv':args,'returncode':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
  if p.returncode:raise RuntimeError(p.stderr)
  return p.stdout.strip()
 try:
  record['binaryen']=run([exe,'--version'])
  base=[os.environ.get('CLANG','clang'),'--target=wasm32','-O2','-g','-ffreestanding','-fno-builtin','-nostdlib',
   '-ffile-prefix-map='+str(ROOT)+'=/demuxe-asyncify-study','-DDEMUXE_COOP_THREADS=1','-Itests/support','-Iruntime','-Iupstream',
   'runtime/threads-coop.c','runtime/asyncify-stacks.c','runtime/stack.s','review/tests/continuation-probe.c',
   '-Wl,--no-entry','-Wl,--export-memory','-Wl,-z,stack-size=1048576','-Wl,--initial-memory=33554432',
   '-Wl,--max-memory=67108864',*['-Wl,--export='+name for name in EXPORTS]]
  run([*base,'-o','artifacts/continuation-probe.wasm'])
  run([*base,'-DDEMUXE_ASYNCIFY_BYTES=256','-o','artifacts/continuation-probe-small.wasm'])
  imports='demuxe_coop.wait,demuxe_coop.join,demuxe_coop.yield'
  for src,dst,extra in [('continuation-probe.wasm','continuation-probe.asyncify.wasm',',review_io.value'),
    ('continuation-probe-small.wasm','continuation-probe-small.asyncify.wasm',',review_io.value'),
    ('continuation-probe.wasm','continuation-probe-omitted-import.asyncify.wasm','')]:
   run([exe,'artifacts/'+src,'--asyncify','--pass-arg=asyncify-imports@'+imports+extra,
     '--enable-bulk-memory','-g','-o','artifacts/'+dst])
  record['status']='built'
  record['artifacts']={'artifacts/'+name:{'bytes':(ROOT/'artifacts'/name).stat().st_size,
    'sha256':hashlib.sha256((ROOT/'artifacts'/name).read_bytes()).hexdigest()} for name in ARTIFACTS}
 except Exception as error:
  record['status']='failed';record['error']=str(error)
 finally:(ROOT/'results/review-probe-build.json').write_text(json.dumps(record,indent=2)+'\n')
 if record['status']!='built':raise SystemExit(record['error'])
 print('Built continuation fixtures (not media services).')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--wasm-opt',type=pathlib.Path,required=True)
 main(p.parse_args())

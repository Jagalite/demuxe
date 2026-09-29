#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Additional actual-Wasm continuation tests; no media libraries."""
import argparse, asyncio, base64, datetime, hashlib, importlib.util, json, os, pathlib, sys
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('dual',ROOT/'scripts/run-dual.py')
dual=importlib.util.module_from_spec(spec);spec.loader.exec_module(dual)
NAMES=['no-suspension-normal-return','single-suspension-no-placeholder-result','synchronous-ready-before-unwind',
'duplicate-wakeup-is-ignored','nested-C-stacks-survive','memory-growth-with-saved-continuation',
'multi-task-out-of-order','indirect-callback-instrumented','C-negative-result-is-not-runtime-failure',
'throwing-import-is-terminal','trap-after-resume-is-terminal','abandon-pending-task-rejects-late-resume']
async def main(a):
 result={'scope':'Actual freestanding JSPI/Asyncify continuation checks; NOT Emscripten or media',
 'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'transport':'about:blank/Blob Worker','runs':[],
 'sourceSHA256':{x:hashlib.sha256((ROOT/x).read_bytes()).hexdigest() for x in [
 'runtime/continuations.mjs','runtime/scheduler.mjs','review/tests/continuation-worker.js','review/run-continuations.py']}}
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),
    headless=True,args=['--no-sandbox'])
  try:
   result['browser']=browser.version
   page=await browser.new_page();await page.goto('about:blank')
   src='\n'.join(dual.js(x) for x in ['runtime/continuations.mjs','runtime/scheduler.mjs','review/tests/continuation-worker.js'])
   for backend in ['jspi','asyncify']:
    cases=[(name,False) for name in NAMES]
    if backend=='asyncify':cases += [('saved-stack-canary-is-fatal',False),('undersized-saved-stack-fails-closed',False),('indirect-callback-instrumented',True)]
    for name,negative in cases:
     if a.filter and a.filter not in name:continue
     binary_name='artifacts/continuation-probe'
     if negative:binary_name+='-omitted-import'
     elif name=='undersized-saved-stack-fails-closed':binary_name+='-small'
     if backend=='asyncify':binary_name+='.asyncify'
     binary_name+='.wasm';binary=(ROOT/binary_name).read_bytes()
     response=await page.evaluate("""async ({src,b64,name,backend})=>{
       const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
       let w,timer;
       try{return await new Promise(resolve=>{
        const finish=r=>{clearTimeout(timer);resolve(r);};
        timer=setTimeout(()=>finish({ok:false,error:'review watchdog timeout'}),20000);
        w=new Worker(url);w.onmessage=({data})=>finish(data);w.onerror=e=>finish({ok:false,error:e.message});
        const bytes=Uint8Array.from(atob(b64),x=>x.charCodeAt(0));
        w.postMessage({name,backend,bytes},[bytes.buffer]);
       });}finally{clearTimeout(timer);w?.terminate();URL.revokeObjectURL(url);}
     }""",{'src':src,'b64':base64.b64encode(binary).decode(),'name':name,'backend':backend})
     environment=(response.get('backend')==backend and response.get('crossOriginIsolated') is False and
       response.get('sharedArrayBufferAvailable') is False and response.get('memoryType')=='ArrayBuffer' and
       response.get('nestedWorkersCreated')==0 and response.get('jspiGetterAccesses')==0 and
       (backend!='asyncify' or response.get('jspiDisabled') is True))
     good=environment and (response.get('ok') is True if not negative else response.get('ok') is False and 'continuation side effects repeated' in response.get('error',''))
     result['runs'].append({'backend':backend,'name':name,'negative':negative,'qualified':bool(good),
       'artifact':binary_name,'wasmSHA256':hashlib.sha256(binary).hexdigest(),'result':response})
     print(backend,name,'NEGATIVE' if negative else '', 'PASS' if good else 'FAIL',response.get('error','')[:250],flush=True)
     (ROOT/'results'/a.output).write_text(json.dumps(result,indent=2)+'\n')
  finally:await browser.close()
 result.update(total=len(result['runs']),passed=sum(r['qualified'] for r in result['runs']))
 (ROOT/'results'/a.output).write_text(json.dumps(result,indent=2)+'\n')
 print('TOTAL',result['passed'],'/',result['total'])
 return 0 if result['total'] and result['total']==result['passed'] else 1
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--filter',default='');p.add_argument('--output',default='review-continuations.json')
 a=p.parse_args()
 if pathlib.Path(a.output).name!=a.output:p.error('output must be a filename')
 sys.exit(asyncio.run(main(a)))

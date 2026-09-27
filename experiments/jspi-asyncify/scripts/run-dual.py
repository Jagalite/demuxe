#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Same real C infrastructure + shimmed stream tests under two continuation drivers.
No complete Emscripten, FFmpeg, libmpv, libass, or media playback is used here.
"""
import argparse,ast,asyncio,base64,datetime,hashlib,json,os,pathlib,platform,re,subprocess,sys
from playwright.async_api import async_playwright
from result_contract import validate_result, BACKENDS, SUITES
ROOT=pathlib.Path(__file__).resolve().parents[1]

def names(path):
    tree=ast.parse(path.read_text())
    return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='NAMES' for t in n.targets))

def js(path):
    text=(ROOT/path).read_text()
    text=re.sub(r'^import .*?;\n','',text,flags=re.M)
    return text.replace('export class ','class ').replace('export function ','function ')

async def main(a):
    result={'scope':'Actual pinned mpv dispatch/thread-pool, and C stream bridge with test registration shim; NOT full libmpv or media',
      'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'host':platform.platform(),
      'transport':'about:blank/Blob Worker',
      'sourceSHA256':{x:hashlib.sha256((ROOT/x).read_bytes()).hexdigest() for x in [
        'runtime/continuations.mjs','runtime/scheduler.mjs','stage2/runtime/range-source.mjs',
        'tests/browser-worker.js','stage2/tests/range-worker.js','scripts/run-dual.py','scripts/result_contract.py']},
      'clang':subprocess.check_output([os.environ.get('CLANG','clang'),'--version'],text=True).splitlines()[0], 'runs':[]}
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        page=await browser.new_page();await page.goto('about:blank');result['browser']=browser.version
        for backend in a.backends.split(','):
          for suite in a.suites.split(','):
            test_names=names(ROOT/('run-units.py' if suite=='units' else 'stage2/scripts/run-bridge.py'))
            unit=suite=='units';base=js('runtime/continuations.mjs')+'\n'+js('runtime/scheduler.mjs')+'\n'
            if not unit:base+=js('stage2/runtime/range-source.mjs')+'\n'
            base+=js('tests/browser-worker.js' if unit else 'stage2/tests/range-worker.js')
            wasm_path=ROOT/('artifacts/mpv-coop-units'+('.asyncify' if backend=='asyncify' else '')+'.wasm' if unit else ('artifacts/range-bridge.asyncify.wasm' if backend=='asyncify' else 'stage2/artifacts/range-bridge.wasm'))
            binary=wasm_path.read_bytes()
            # Force the Asyncify test realm to have neither JSPI primitive.
            preamble='''const __post=self.postMessage.bind(self);
self.postMessage=(data,...rest)=>__post({...data,testBackend:%s,jspiAvailable:typeof WebAssembly.Suspending==='function'&&typeof WebAssembly.promising==='function',
jspiSuspendingAvailable:typeof WebAssembly.Suspending==='function',jspiPromisingAvailable:typeof WebAssembly.promising==='function'},...rest);
'''%json.dumps(backend)
            if backend=='asyncify':preamble+='''Object.defineProperty(WebAssembly,'Suspending',{value:undefined,writable:false,configurable:false});
Object.defineProperty(WebAssembly,'promising',{value:undefined,writable:false,configurable:false});
'''
            cases=[(name,i,False) for i,name in enumerate(test_names) if not a.filter or a.filter in name]
            if not a.filter:cases.append(('negative-no-linear-stack-switch' if unit else 'cancel-after-ready-before-c-owner-resume',2 if unit else 0,True))
            for name,i,negative in cases:
              source=base
              if negative and not unit:
                anchor='if(!this.valid(h) || r.cancelled)'
                if source.count(anchor)!=1:raise ValueError('Negative-control source anchor changed')
                source=source.replace(anchor,'if(false /* negative control */)')
              response=await page.evaluate('''async ({src,b64,name,which,backend,unsafeSharedStack})=>{
                const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));const w=new Worker(url);
                return await new Promise(resolve=>{
                  const finish=r=>{clearTimeout(timer);w.terminate();URL.revokeObjectURL(url);resolve(r);};
                  const timer=setTimeout(()=>finish({ok:false,error:'watchdog timeout'}),25000);
                  w.onmessage=({data})=>finish(data);w.onerror=e=>finish({ok:false,error:e.message});
                  const bytes=Uint8Array.from(atob(b64),x=>x.charCodeAt(0));w.postMessage({name,which,backend,unsafeSharedStack,bytes},[bytes.buffer]);
                });
              }''',{'src':preamble+source,'b64':base64.b64encode(binary).decode(),'name':name,'which':i,'backend':backend,'unsafeSharedStack':negative and unit})
              good,errors=validate_result(backend,suite,negative,name,response)
              entry={'backend':backend,'suite':suite,'name':name,'negative':negative,'qualified':bool(good),'validationErrors':errors,'wasmSHA256':hashlib.sha256(binary).hexdigest(),'result':response}
              result['runs'].append(entry);print(backend,suite,name,'PASS' if good else 'FAIL',response.get('error','')[:230],flush=True)
              dest=ROOT/'results'/a.output;dest.write_text(json.dumps(result,indent=2)+'\n')
        await browser.close()
    result['passed']=sum(x['qualified'] for x in result['runs']);result['total']=len(result['runs'])
    (ROOT/'results'/a.output).write_text(json.dumps(result,indent=2)+'\n')
    print('TOTAL',result['passed'],'/',result['total'])
    return 0 if result['runs'] and result['passed']==result['total'] else 1

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--backends',default='jspi,asyncify');p.add_argument('--suites',default='units,range');p.add_argument('--filter',default='');p.add_argument('--output',default='dual-runtime.json');a=p.parse_args()
    if any(x not in BACKENDS for x in a.backends.split(',')) or len(set(a.backends.split(',')))!=len(a.backends.split(',')):
        p.error('backends must be a unique subset of jspi,asyncify')
    if any(x not in SUITES for x in a.suites.split(',')) or len(set(a.suites.split(',')))!=len(a.suites.split(',')):
        p.error('suites must be a unique subset of units,range')
    if pathlib.Path(a.output).name!=a.output or not a.output.endswith('.json'):
        p.error('output must be a JSON filename')
    sys.exit(asyncio.run(main(a)))

# SPDX-License-Identifier: MIT
"""Actual MSE request deduplication with immutable prevalidated fixture handles.
This is not a network/cache implementation or a production decoder owner.
"""
from browser_common import *
JS='async arg=>{'+JS_COMMON+r'''
 const out={mode:arg.mode,checks:[],calls:[],counts:{requests:0,mediaAppends:0,bytes:0,pendingJoins:0,committedSkips:0,aborts:0}};
 const v=document.createElement('video');v.muted=true;document.body.append(v);const ms=new MediaSource(),url=URL.createObjectURL(ms);let sb,epoch=1;let queue=Promise.resolve();const ledger=new Map();
 const ranges=()=>Array.from({length:sb.buffered.length},(_,i)=>[sb.buffered.start(i),sb.buffered.end(i)]);
 const covered=(lo,hi)=>ranges().some(([a,b])=>a<=lo+1e-6&&b>=hi-1e-6);
 const actualAppend=(data,abortNow=false)=>new Promise((resolve,reject)=>{
  let failure=null;
  const cleanup=()=>{clearTimeout(tm);sb.removeEventListener('error',err);sb.removeEventListener('abort',ab);sb.removeEventListener('updateend',end)};
  const err=()=>failure='error',ab=()=>failure='abort';
  const end=()=>{cleanup();failure?reject(Error(failure)):resolve()};
  const tm=setTimeout(()=>{cleanup();reject(Error('append timeout'))},2500);
  sb.addEventListener('error',err);sb.addEventListener('abort',ab);sb.addEventListener('updateend',end);
  try{sb.appendBuffer(data);if(abortNow){sb.abort();out.counts.aborts++}}catch(e){cleanup();reject(e)}
 });
 const submit=(id,offset=0,abortNow=false)=>{
  out.counts.requests++;const f=arg.fragments[id],lo=f.start+offset,hi=f.end+offset,data=bytes(f.data);
  // Digest originates in immutable, host-validated fixture manifests; no claim of browser hash validation.
  const naive=arg.mode.includes('naive');const bypass=arg.mode.includes('reference');
  const key=naive?f.sha256:JSON.stringify([arg.sourceIdentity,arg.initIdentity,epoch,f.sha256,offset,0,'Infinity','segments']);
  const old=ledger.get(key);
  if(!bypass&&old){
   if(old.pending){out.counts.pendingJoins++;return old.promise;}
   if(naive||covered(lo,hi)){out.counts.committedSkips++;out.calls.push({id,offset,status:'skip',coverage:ranges()});return Promise.resolve('skip');}
   ledger.delete(key);
  }
  let record={pending:true,epoch};
  let task=queue.then(async()=>{
   if(record.epoch!==epoch)throw Error('retired epoch');
   sb.timestampOffset=offset;out.counts.mediaAppends++;out.counts.bytes+=data.length;
   try{await actualAppend(data,abortNow);record.pending=false;record.success=true;out.calls.push({id,offset,status:'committed',coverage:ranges()});return 'committed';}
   catch(e){ledger.delete(key);out.calls.push({id,offset,status:'rejected',why:String(e)});throw e;}
  });
  queue=task.catch(()=>{});record.promise=task;ledger.set(key,record);return task;
 };
 try{
  const op=ev(ms,'sourceopen');v.src=url;await op;sb=ms.addSourceBuffer(arg.mime);await actualAppend(bytes(arg.init));
  if(arg.mode.startsWith('duplicates')){
   for(let i=0;i<3;i++){
    // Pending duplicate joins one actual operation. Reference serializes both real appends.
    await Promise.all([submit(i),submit(i)]);await submit(i);
   }
  }else if(arg.mode.startsWith('repeat')){
   await submit(0);await submit(0,1);await submit(2);
  }else if(arg.mode.startsWith('evict')){
   for(let i=0;i<3;i++)await submit(i);
   out.preEvict=await seek(v,2.54);const done=ev(sb,'updateend');sb.remove(0,1);await done;out.afterEvict=ranges();await submit(0);out.afterRefill=ranges();
  }else if(arg.mode.startsWith('overwrite')){
   for(let i=0;i<3;i++)await submit(i);await submit(4);await submit(1);
  }else if(arg.mode.startsWith('pending_aba')){
   await Promise.all([submit(0),submit(3),submit(0)]);await submit(1);await submit(2);
  }else if(arg.mode==='abort_guarded'){
   try{await submit(0,0,true);out.abortUnexpectedSuccess=true}catch(e){out.abortRejected=String(e)}
   for(let i=0;i<3;i++)await submit(i);
  }else if(arg.mode==='epoch_guarded'){
   for(let i=0;i<3;i++)await submit(i);
   epoch++;ledger.clear();out.preEvict=await seek(v,2.54);const done=ev(sb,'updateend');sb.remove(0,3.1);await done;
   for(let i=0;i<3;i++)await submit(i);
  }else{
   for(let i=0;i<3;i++)await submit(i);
  }
  out.finalCoverage=ranges();ms.endOfStream();out.duration=v.duration;
  for(const t of arg.targets)out.checks.push(await seek(v,t));
  await seek(v,.06);let done=ev(v,'ended',5000);await v.play();await done;out.ended=true;
 }catch(e){out.error=String(e);out.mediaError=v.error?{code:v.error.code,message:v.error.message}:null;out.finalCoverage=sb?ranges():[]}
 finally{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);ledger.clear();out.cleaned=true;}
 return out;
}'''
def main():
 m=json.loads((E/'manifest.json').read_text());lm=m['ledger'];out=json.loads((E/'browser_ledger_v0.json').read_text()) if (E/'browser_ledger_v0.json').exists() else {};args=dict(lm,sourceIdentity=sha((F/'ledger.mp4').read_bytes()),initIdentity=sha((F/lm['init']).read_bytes()),init=b64(lm['init']))
 args['fragments']=[dict(x,data=b64(x['file']),sha256=sha((F/x['file']).read_bytes()),start=i,end=i+1) for i,x in enumerate(lm['fragments'])]
 args['fragments'] += [dict(x,data=b64(x['file']),sha256=sha((F/x['file']).read_bytes()),start=i,end=i+1) for i,x in enumerate(m['alternate']['fragments'])]
 with sync_playwright() as p:
  br=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=br.new_page();page.set_content('<!doctype html><body></body>')
  modes=['reference','duplicates_reference','duplicates_guarded','repeat_reference','repeat_guarded','repeat_naive','evict_guarded','evict_naive','abort_guarded','epoch_guarded']
  import sys
  if '--only' in sys.argv:modes=[sys.argv[sys.argv.index('--only')+1]]
  for mode in modes:
   r=page.evaluate(JS,dict(args,mode=mode));out[mode]=pack_raw(r,mode);save('browser_ledger_v0.json',out)
   print(mode,'counts',r['counts'],'checks',len(r['checks']),'ranges',r.get('finalCoverage'),'EOF',r.get('ended'),'error',r.get('error'),flush=True)
  br.close()
if __name__=='__main__':main()

/* SPDX-License-Identifier: MIT */
function ranges(x){return Array.from({length:x.length},(_,i)=>[x.start(i),x.end(i)])}
async function ordered(variant){let v=document.createElement('video');v.muted=true;document.body.appendChild(v);let ms=new MediaSource(),url=URL.createObjectURL(ms);v.src=url;let out={variant,pictures:[],appends:[],fetched:[]};
 try{await event(ms,'sourceopen');let sb=ms.addSourceBuffer('video/mp4; codecs="'+orderManifest.codec+'"');out.sourceBufferCount=ms.sourceBuffers.length;if(variant==='wrong_sequence')sb.mode='sequence';await append(sb,await loadFile(orderManifest.init));out.fetched.push(orderManifest.init);
 let order={baseline:[0,1,2,3],permuted:[2,0,3,1],tail_first:[3,2,1,0],sparse_seek:[3,0,1,2],wrong_sequence:[2,0,3,1],duplicate:[0,1,1,2,3],wrong_time:[0,1,2,3]}[variant];
 for(let [step,i]of order.entries()){let name=variant==='wrong_time'&&i===3?'order3_wrong_time.m4s':orderManifest.fragments[i].file;let data=await loadFile(name);out.fetched.push(name);await append(sb,data);out.appends.push({fragment:i,ranges:ranges(sb.buffered)});
  if(variant==='sparse_seek'&&step===0){if(v.readyState<1)await event(v,'loadedmetadata');out.early=await seekPicture(v,3.225);out.earlyFetched=[...out.fetched];out.earlyBuffered=ranges(sb.buffered)}
 }ms.endOfStream();if(v.readyState<1)await event(v,'loadedmetadata');out.duration=v.duration;out.buffered=ranges(sb.buffered);
 for(let t of [.225,.725,1.225,1.725,2.225,2.725,3.225,3.725,1.025,.375])out.pictures.push(await seekPicture(v,t));
 v.playbackRate=4;let end=event(v,'ended',5000);await v.play();await end;out.ended=true;out.retainedMediaSource=v.src===url;out.retainedSourceBuffer=ms.sourceBuffers.length===1&&ms.sourceBuffers[0]===sb;
 }catch(e){out.error=String(e)}finally{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);out.cleaned=true}return out}

async function clip(variant){const v=document.createElement('video');v.muted=true;document.body.appendChild(v);const ms=new MediaSource(),url=URL.createObjectURL(ms);v.src=url;const o={variant,pictures:[]};
 try{await event(ms,'sourceopen');const sb=ms.addSourceBuffer('video/mp4; codecs="'+manifest.bcodec+'"');
 // This is a seek/start-boundary experiment, not an exact excerpt exporter.
 if(variant==='window')sb.appendWindowStart=.36;
 if(variant==='zero_retime'){sb.timestampOffset=-.36;sb.appendWindowStart=0}
 await append(sb,await loadFile('bframes.mp4'));ms.endOfStream();o.ranges=Array.from({length:sb.buffered.length},(_,i)=>[sb.buffered.start(i),sb.buffered.end(i)]);if(v.readyState<1)await event(v,'loadedmetadata');o.duration=v.duration;
 for(let t of [.38,.62,1.22])o.pictures.push(await seekPicture(v,variant==='zero_retime'?t-.36:t));
 v.playbackRate=4;let end=event(v,'ended');await v.play();await end;o.ended=true;
 }catch(e){o.error=String(e)}finally{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url)}return o}

// SPDX-License-Identifier: Apache-2.0
/** The primary playback action needs a trusted click in browsers with autoplay
 * restrictions. Preview generation must never receive this gesture helper. */
let serial=0;
export function playWithGesture(player){
 if(typeof window.previewGesture!=='function')return player.play();
 return new Promise((resolve,reject)=>{
  const button=document.createElement('button'),id=String(++serial);button.dataset.previewGesture=id;button.textContent='Play test media';
  button.onclick=()=>{try{Promise.resolve(player.play()).then(resolve,reject).finally(()=>button.remove());}catch(e){button.remove();reject(e);}};
  document.body.append(button);window.previewGesture(id).catch(e=>{button.remove();reject(e);});
 });
}

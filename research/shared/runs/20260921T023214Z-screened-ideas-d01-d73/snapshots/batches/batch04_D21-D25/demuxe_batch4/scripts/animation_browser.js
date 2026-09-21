/* SPDX-License-Identifier: MIT. Native PNG decode with application-owned composition. */
async function animationSuite(){const m=JSON.parse(new TextDecoder().decode(await loadFile('animation_manifest.json')));const result={cases:[],controls:{},allBitmapsClosed:true};
 const render=async(plan)=>{const c=document.createElement('canvas');c.width=m.w;c.height=m.h;const ctx=c.getContext('2d',{willReadFrequently:true});let decoded=0;
 for(const op of plan.ops){const f=m.frames[op.id];if(op.op==='clear'){ctx.clearRect(f.x,f.y,f.w,f.h);continue}
 let bmp;try{bmp=await createImageBitmap(new Blob([await loadFile('apng_frame_'+op.id+'.png')],{type:'image/png'}));if(f.blend===0)ctx.clearRect(f.x,f.y,f.w,f.h);ctx.drawImage(bmp,f.x,f.y);decoded++}finally{bmp?.close()}}
 const pixels=ctx.getImageData(0,0,c.width,c.height).data;const expected=await loadFile('apng_expected_'+plan.target+'.rgba');let different=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==expected[i])different++;
 return {target:plan.target,anchor:plan.anchor,decodedFrames:decoded,operationCount:plan.ops.length,rgbaSha256:hash(pixels),expectedSha256:hash(expected),differentComponents:different};}
 // Non-monotonic requests prove each cold plan constructs its own required canvas state.
 for(const i of [11,0,9,8,3,7,4,10,2,6,1,5])result.cases.push(await render(m.plans[i]));
 result.controls.fullSourcePreviousIsNotPersistentAnchor=await render(m.unsafe_plan_9);
 result.controls.ignoringDisposal=await render(m.ignore_disposal_plan_3);
 const whole=await bitmap('seek_animation.apng');result.whole_apng_bitmap=whole;
 return result;}

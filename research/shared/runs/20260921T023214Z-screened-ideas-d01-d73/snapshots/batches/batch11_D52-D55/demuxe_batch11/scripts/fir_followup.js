/* SPDX-License-Identifier: MIT. Diagnose channel/tail ownership without assuming root cause. */
window.firFollowup=async()=>{
 const x=floats(await loadFile('fir_input.f32')),h=floats(await loadFile('fir_kernel.f32')),oracle=floats(await loadFile('fir_reference.f32')),N=fir.input_frames,L=fir.output_frames;
 let out={};
 for(let mode of ['default','explicit-discrete','explicit-speakers','padded-source']){
 const ctx=new OfflineAudioContext(2,L,48000),a=ctx.createBuffer(2,mode==='padded-source'?L:N,48000),ir=ctx.createBuffer(1,h.length,48000);
 for(let c=0;c<2;c++){const d=a.getChannelData(c);for(let i=0;i<N;i++)d[i]=x[i*2+c]}ir.copyToChannel(h,0);
 const s=ctx.createBufferSource(),cv=ctx.createConvolver();cv.normalize=false;
 if(mode.startsWith('explicit')){cv.channelCount=2;cv.channelCountMode='explicit';cv.channelInterpretation=mode.endsWith('discrete')?'discrete':'speakers'}cv.buffer=ir;s.buffer=a;s.connect(cv);cv.connect(ctx.destination);s.start();
 const y=packed(await ctx.startRendering());s.disconnect();cv.disconnect();let errors=[];for(let i=0;i<y.length;i++)if(Math.abs(y[i]-oracle[i])>2e-6)errors.push(i);
 out[mode]={comparison:compare(y,oracle),overTolerance:errors.length,firstErrors:errors.slice(0,8).map(i=>({frame:Math.floor(i/2),channel:i%2,actual:y[i],expected:oracle[i]})),lastErrors:errors.slice(-4),prefix:compare(y.slice(0,(N-128)*2),oracle.slice(0,(N-128)*2)),tail:compare(y.slice(N*2),oracle.slice(N*2))};
 }
 return out;
};

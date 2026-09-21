/* SPDX-License-Identifier: MIT. Minimal independent channel-tail witness. */
window.tailMinimal=async()=>{
 const N=129,T=513,L=N+T-1,answer={};
 for(const mode of ['default','explicit','padded']){
  const ctx=new OfflineAudioContext(2,L,48000),src=ctx.createBufferSource(),cv=ctx.createConvolver(),a=ctx.createBuffer(2,mode==='padded'?L:N,48000),h=ctx.createBuffer(1,T,48000);
  a.getChannelData(0)[128]=.5;a.getChannelData(1)[128]=-.25;
  for(const [i,v] of [[0,1],[128,.5],[256,-.25],[512,.125]])h.getChannelData(0)[i]=v;
  cv.normalize=false;if(mode==='explicit'){cv.channelCountMode='explicit';cv.channelCount=2;cv.channelInterpretation='discrete'}cv.buffer=h;src.buffer=a;src.connect(cv);cv.connect(ctx.destination);src.start();
  const y=await ctx.startRendering(),expected=[new Float32Array(L),new Float32Array(L)];for(const [i,v] of [[0,1],[128,.5],[256,-.25],[512,.125]]){expected[0][128+i]=.5*v;expected[1][128+i]=-.25*v}
  answer[mode]={channels:[compare(y.getChannelData(0),expected[0]),compare(y.getChannelData(1),expected[1])],witness:[128,256,384,640].map(i=>({frame:i,actual:[y.getChannelData(0)[i],y.getChannelData(1)[i]],expected:[expected[0][i],expected[1][i]]}))};src.disconnect();cv.disconnect();
 }
 return answer;
};

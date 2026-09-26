// SPDX-License-Identifier: Apache-2.0
// Correctness-only observer, installed before Player creates its audio graph.
export function installAudioProbe(){
 const connect=AudioNode.prototype.connect,Context=window.AudioContext;
 const tapped=new WeakSet(),analysers=[],contexts=[];
 function tap(node){
  if(tapped.has(node))return;tapped.add(node);
  const splitter=node.context.createChannelSplitter(2);connect.call(node,splitter);
  for(let channel=0;channel<2;channel++){
   const analyser=node.context.createAnalyser();analyser.fftSize=8192;
   connect.call(splitter,analyser,channel);analysers.push({analyser,channel});
  }
 }
 AudioNode.prototype.connect=function(destination,...args){
  if(destination instanceof AudioDestinationNode)tap(this);
  return connect.call(this,destination,...args);
 };
 window.urlAudioProbe={
  async observeVideo(video){
   const context=new Context();contexts.push(context);
   const source=context.createMediaElementSource(video);source.connect(context.destination);
   await context.resume();
  },
  sample(){return analysers.map(({analyser,channel})=>{
   const wave=new Float32Array(analyser.fftSize),spectrum=new Float32Array(analyser.frequencyBinCount);
   analyser.getFloatTimeDomainData(wave);analyser.getFloatFrequencyData(spectrum);
   let bin=1;for(let i=2;i<spectrum.length;i++)if(spectrum[i]>spectrum[bin])bin=i;
   return {channel,rms:Math.sqrt(wave.reduce((sum,x)=>sum+x*x,0)/wave.length),hz:bin*analyser.context.sampleRate/analyser.fftSize};
  });},
  async close(){AudioNode.prototype.connect=connect;await Promise.all(contexts.map(context=>context.close()));},
 };
}

import {AudioRelay} from './audio-relay.js';
let relay,timer;
self.onmessage=({data})=>{
  if(data.type==='close'){clearInterval(timer);relay?.close();postMessage({type:'closed'});self.close();return;}
  try{
    if(data.type!=='init'||relay)throw Error('Invalid audio relay lifecycle');
    relay=new AudioRelay(data.memory,data.pointer,data.audio,data.channels);
    timer=setInterval(()=>{try{relay.pump();}catch(error){clearInterval(timer);relay.close();postMessage({type:'error',message:String(error.message)});}},5);
    postMessage({type:'ready'});
  }catch(error){postMessage({type:'error',message:String(error.message)});}
};

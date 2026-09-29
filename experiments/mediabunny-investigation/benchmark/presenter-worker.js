// SPDX-License-Identifier: Apache-2.0
import {WebCodecsPresenter} from '../../../web/video-presenter.js';
let presenter;
self.onmessage=({data})=>{
  if(data.canvas){presenter=new WebCodecsPresenter(data.canvas,data.canvas.getContext('2d',{alpha:false}));postMessage({ready:true});return;}
  if(data.close){presenter?.destroy();close();return;}
  const frame=data.frame;
  try{presenter.draw(frame);postMessage({drawn:true,timestamp:frame.timestamp});}
  catch(e){postMessage({error:String(e)});}finally{frame.close();}
};

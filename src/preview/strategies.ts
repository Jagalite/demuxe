// SPDX-License-Identifier: Apache-2.0
import type {PreviewStrategy,PreviewPregeneration} from '../types.js';
import type {AdaptivePregeneration} from './pregeneration.js';

export function resolvePreviewStrategy(value:PreviewStrategy):{strategy:PreviewStrategy;generation?:PreviewPregeneration|AdaptivePregeneration}{
  if(!value||typeof value!=='object')throw new TypeError('Invalid preview strategy');
  switch(value.type){
    case 'on-demand':return {strategy:Object.freeze({type:'on-demand'})};
    case 'uniform':{
      const samples=value.samples??48;
      return {strategy:Object.freeze({type:'uniform',samples}),generation:{samples}};
    }
    case 'interval':{
      const every=value.every??5,unit=value.unit??'seconds',count=value.count;
      return {strategy:Object.freeze({type:'interval',every,unit,count}),generation:{every,unit,count}};
    }
    case 'adaptive':{
      const samples=value.samples??24,every=value.every??5,radius=value.radius??30;
      return {strategy:Object.freeze({type:'adaptive',samples,every,radius}),generation:{strategy:'adaptive',samples,every,radius}};
    }
    case 'timestamps':{
      if(!Array.isArray(value.timestamps))throw new TypeError('Invalid preview timestamps');
      const timestamps=Object.freeze([...value.timestamps]),count=value.count;
      return {strategy:Object.freeze({type:'timestamps',timestamps,count}),generation:{timestamps,count}};
    }
    default:throw new TypeError('Unknown preview strategy');
  }
}

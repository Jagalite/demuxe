// SPDX-License-Identifier: Apache-2.0
import {Input,CustomSource,CanvasSink,MP4,QTFF} from 'mediabunny';
import {createMediaBunnyPreviewProvider as create} from './adapter-factories.js';
export function createMediaBunnyPreviewProvider(options){return create({...options,formats:[MP4,QTFF],load:async()=>({Input,CustomSource,CanvasSink})});}

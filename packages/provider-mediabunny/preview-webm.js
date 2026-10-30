// SPDX-License-Identifier: Apache-2.0
import {Input,CustomSource,CanvasSink,WEBM,MATROSKA} from 'mediabunny';
import {createMediaBunnyPreviewProvider as create} from './adapter-factories.js';
export function createMediaBunnyPreviewProvider(options){return create({...options,formats:[WEBM,MATROSKA],load:async()=>({Input,CustomSource,CanvasSink})});}

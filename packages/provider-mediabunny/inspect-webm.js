// SPDX-License-Identifier: Apache-2.0
import {Input,CustomSource,WEBM,MATROSKA} from 'mediabunny';
import {createMediaBunnyInspector as create} from './adapter-factories.js';
export function createMediaBunnyInspector(){return create({formats:[WEBM,MATROSKA],load:async()=>({Input,CustomSource})});}

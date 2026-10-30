// SPDX-License-Identifier: Apache-2.0
import {Input,CustomSource,MP4,QTFF} from 'mediabunny';
import {createMediaBunnyInspector as create} from './adapter-factories.js';
export function createMediaBunnyInspector(){return create({formats:[MP4,QTFF],load:async()=>({Input,CustomSource})});}

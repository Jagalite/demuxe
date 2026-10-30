// SPDX-License-Identifier: Apache-2.0
import {createMediaBunnyInspector as inspector,createMediaBunnyPreviewProvider as preview} from './adapter-factories.js';
// The configurable entry retains its historical full-SDK loader. Container
// subpaths import the factories directly and supply only their static runtime.
export function createMediaBunnyInspector(options){return inspector({...options,load:options?.load??(()=>import('mediabunny'))});}
export function createMediaBunnyPreviewProvider(options){return preview({...options,load:options?.load??(()=>import('mediabunny'))});}

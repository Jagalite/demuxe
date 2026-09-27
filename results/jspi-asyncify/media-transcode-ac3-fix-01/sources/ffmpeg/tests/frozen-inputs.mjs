// SPDX-License-Identifier: MIT
import {readFile} from 'node:fs/promises';

// Every response uses the bytes recorded before the browser starts.
export function frozenInputs() {
 const cache=new Map();let sealed=false;
 return {
  async load(file){
   if(!cache.has(file)){
    if(sealed)throw Error('Unrecorded input: '+file);
    cache.set(file,await readFile(file));
   }
   return cache.get(file);
  },
  seal(){sealed=true;},
 };
}

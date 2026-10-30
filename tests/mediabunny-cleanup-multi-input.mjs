// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as runtime from '../packages/provider-mediabunny/node_modules/mediabunny/dist/modules/src/index.js';
import {createMP4VideoPreparer} from '../packages/provider-mediabunny/mp4-preparation.js';

test('successful preparation retires both parsers even if one disposal fails',async()=>{
 const failure=new Error('input disposal failed'),calls=[];let serial=0;
 const configured={...runtime,Input:class extends runtime.Input{
  constructor(options){super(options);this.testId=++serial;}
  dispose(){calls.push(this.testId);super.dispose();if(this.testId===1)throw failure;}
 }};
 const file=new Blob([await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/avc-aac-320x240.mp4',import.meta.url))]);
 const prepare=createMP4VideoPreparer({load:async()=>configured});
 await assert.rejects(prepare(file,{sourceTracks:[{id:'v',type:'video',codec:'h264'},{id:'a',type:'audio',codec:'aac',sampleRate:48000,channels:2}]}),error=>error===failure);
 assert.deepEqual(calls,[1,2]);
});

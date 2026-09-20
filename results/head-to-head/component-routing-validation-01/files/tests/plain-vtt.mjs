// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plainVTT} from '../web/generated/internal/plain-vtt.js';
const asset=text=>({format:'vtt',bytes:new TextEncoder().encode(text).buffer,label:'test',select:true});
test('plain captions preserve overlapping multiline cues and hour timestamps',()=>{
 assert.deepEqual(plainVTT(asset('WEBVTT\n\n00:00.500 --> 00:02.000\nOne\nTwo\n\n00:01.000 --> 01:00:02.000\nOverlap\n')),[{start:.5,end:2,text:'One\nTwo'},{start:1,end:3602,text:'Overlap'}]);
});
test('rich or unqualified VTT never enters the plain route',()=>{
 for(const text of ['WEBVTT\n\nSTYLE\n::cue {color:red}\n','WEBVTT\n\n00:00.500 --> 00:02.000 align:start\nHi','WEBVTT\n\n00:00.500 --> 00:02.000\n<b>Hi</b>','WEBVTT\n\n00:00.500 --> 00:02.000\nA &amp; B','WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00.000,MPEGTS:1\n'])assert.equal(plainVTT(asset(text)),undefined);
});
test('malformed plain timing and UTF-8 reject without route fallback',()=>{
 for(const timing of ['00:01.000 --> 00:00.500','00:99.000 --> 00:02.000'])assert.throws(()=>plainVTT(asset('WEBVTT\n\n'+timing+'\nHi')),/timing/);
 assert.throws(()=>plainVTT({...asset(''),bytes:new Uint8Array([255]).buffer}),/UTF-8/);
});

// SPDX-License-Identifier: Apache-2.0
import {initialSplitMP4,splitMP4,initialMP4VideoTiming,readMP4VideoTiming} from './generated/internal/machine/split-mp4.js';
// Parser history is one immutable value; each call owns its temporary byte views
// and fresh output buffers. Failed input never partially commits track metadata.
export class SplitMP4 {
 constructor(){this.machine=initialSplitMP4();}
 get ids(){return this.machine.ids;}get defaults(){return new Map(this.machine.defaults.map(entry=>[entry.id,entry.size]));}
 split(input){const decision=splitMP4(this.machine,input);this.machine=decision.state;return decision.buffers;}
}
export class MP4VideoTiming {
 constructor(){this.machine=initialMP4VideoTiming();}
 get track(){return this.machine.track??undefined;}get scale(){return this.machine.scale;}get shift(){return this.machine.shift;}get defaults(){return new Map(this.machine.defaults.map(entry=>[entry.id,entry.duration]));}
 read(input){const decision=readMP4VideoTiming(this.machine,input);this.machine=decision.state;return decision.frames;}
}

// SPDX-License-Identifier: Apache-2.0
import {Player,defaultQualitySelection} from '../src/index.js';
import type {QualitySelector} from '../src/index.js';
declare const host:HTMLElement;
const select:QualitySelector=context=>{
  // @ts-expect-error A selector cannot mutate the player's candidate metadata.
  context.candidates[0].height=720;
  return defaultQualitySelection(context);
};
const player=new Player(host,{adaptation:{select}});
void player.setQuality({mode:'manual',id:'source:variant',switching:'buffered'});
// @ts-expect-error Callers cannot request an unsafe buffer flush.
void player.setQuality({mode:'manual',id:'source:variant',switching:'flush'});
// @ts-expect-error Asynchronous selectors cannot drive the synchronous ABR loop.
const asyncSelector:QualitySelector=async context=>defaultQualitySelection(context);
void asyncSelector;

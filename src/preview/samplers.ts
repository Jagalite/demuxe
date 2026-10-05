// SPDX-License-Identifier: Apache-2.0
import type {PreviewSamplingContext} from '../types.js';
import {demuxeStoryboard} from '../internal/machine/preview-demuxe.js';

export type GaussianSampling=Readonly<{samples:number;every:number;radius:number;sigma:number}>;
export type DirectionalSampling=Readonly<{samples:number;every:number;radius:number;lookAhead:number}>;

/** Equal-mass quantiles of a discrete, truncated normal distribution. No randomness
 * or history: density chooses locations, distance only orders the selected set. */
function normalSamples(context:PreviewSamplingContext,options:GaussianSampling,shift:number):readonly number[] {
  const {duration,bucketSeconds}=context;
  if(!Number.isFinite(duration)||duration<=0||!context.budget.maxEntries||!context.budget.maxBytes)return [];
  const step=Math.max(options.every,bucketSeconds);
  const last=Math.max(0,Math.ceil(duration/step)-1);
  const center=Math.min(last,Math.max(0,Math.round(context.focus/step)));
  const focus=center*step,mean=focus+shift;
  const extent=Math.floor(options.radius/step);
  const grid:Array<{time:number;weight:number}>=[];
  let total=0;
  for(let offset=-extent;offset<=extent;offset++){
    const index=center+offset,time=index*step;
    if(index<0||index>last||!Number.isFinite(time)||time>=duration)continue;
    const weight=Math.exp(-.5*((time-mean)/options.sigma)**2);
    grid.push({time,weight});total+=weight;
  }
  const count=Math.min(options.samples,context.budget.maxEntries);
  if(!Number.isFinite(focus)||focus>=duration)return [];
  const selected=new Set<number>([focus]);
  if(total>0&&count>1){
    let index=0,cumulative=grid[0].weight;
    for(let i=0;i<count-1;i++){
      const target=(i+.5)*total/(count-1);
      while(index<grid.length-1&&cumulative<target)cumulative+=grid[++index].weight;
      selected.add(grid[index].time);
    }
  }
  // The hovered bucket always wins, even when a fast movement predicts far ahead.
  return [focus,...[...selected].filter(time=>time!==focus).sort((a,b)=>Math.abs(a-mean)-Math.abs(b-mean)||b-a)];
}
export function sampleGaussian(context:PreviewSamplingContext,options:GaussianSampling):readonly number[] {
  return normalSamples(context,options,0);
}
export function sampleDirectional(context:PreviewSamplingContext,options:DirectionalSampling):readonly number[] {
  const velocity=context.interaction.source==='hover'?context.interaction.velocity:0;
  const prediction=velocity*options.lookAhead;
  const shift=Math.max(-options.radius/2,Math.min(options.radius/2,prediction));
  return normalSamples(context,{...options,sigma:Math.max(options.every,options.radius/3)},shift);
}

/** A bounded working set, including resident entries, rather than a stream of misses. */
export function sampleDemuxe(context:PreviewSamplingContext):readonly number[] {
  const {budget,interaction}=context;
  if(!budget.maxBytes||!budget.maxEntries)return [];
  const broad=demuxeStoryboard(context.duration,budget.maxEntries,context.bucketSeconds);
  const moving=interaction.source==='hover'&&Math.abs(interaction.velocity)>8&&interaction.dwellMs<300;
  const local=sampleDirectional(context,{samples:Math.min(25,Math.max(1,budget.maxEntries-broad.length)),every:moving?5:1,radius:30,lookAhead:moving?.5:0});
  const result:number[]=[];
  // Focus first; fast travel favors filling the storyboard before dense local work.
  if(local.length)result.push(local[0]);
  let i=1,j=0;
  while(i<local.length||j<broad.length){
    if(moving&&j<broad.length)result.push(broad[j++]);
    for(let n=0;n<(moving?1:3)&&i<local.length;n++)result.push(local[i++]);
    if(!moving&&j<broad.length)result.push(broad[j++]);
  }
  return [...new Set(result)].slice(0,budget.maxEntries);
}

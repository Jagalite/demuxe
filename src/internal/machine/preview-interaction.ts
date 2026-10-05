// SPDX-License-Identifier: Apache-2.0
import type {PreviewSamplingContext} from '../../types.js';

type Source=PreviewSamplingContext['interaction']['source'];
export type PreviewInteractionState=Readonly<{
  source:Source;focus:number;at:number|null;bucketSince:number|null;movedAt:number|null;velocity:number;
}>;
export function createPreviewInteraction():PreviewInteractionState {
  return Object.freeze({source:'playback',focus:0,at:null,bucketSince:null,movedAt:null,velocity:0});
}
/** Observations and clock values are supplied by the owner, never read here. */
export function observePreviewInteraction(state:PreviewInteractionState,source:Source,focus:number,at:number,bucketSeconds:number):PreviewInteractionState {
  if(!Number.isFinite(focus)||focus<0||!Number.isFinite(at))return state;
  const reset=state.at===null||source!==state.source||at<state.at||(source==='hover'&&at-state.at>=1500);
  const bucket=(time:number)=>bucketSeconds?Math.floor(time/bucketSeconds):time;
  const moved=focus!==state.focus;
  const velocity=reset?0:moved?(at>state.at!?(focus-state.focus)*1000/(at-state.at!):0):state.velocity;
  return Object.freeze({source,focus,at,
    bucketSince:reset||bucket(focus)!==bucket(state.focus)?at:state.bucketSince,
    movedAt:reset?null:moved?at:state.movedAt,velocity:Number.isFinite(velocity)?velocity:0});
}
export function snapshotPreviewInteraction(state:PreviewInteractionState,at:number):PreviewSamplingContext['interaction'] {
  return Object.freeze({source:state.source,
    velocity:state.movedAt!==null&&at>=state.movedAt&&at-state.movedAt<=500?state.velocity:0,
    dwellMs:state.bucketSince===null?0:Math.max(0,at-state.bucketSince)});
}

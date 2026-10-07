// SPDX-License-Identifier: Apache-2.0
import type {QualitySelectionContext,QualitySelectionDecision} from '../../types.js';

/** Preserve upgrades; request a responsive downgrade subject to backend safety. */
export function defaultQualitySelection(context:QualitySelectionContext):QualitySelectionDecision {
  if(context.currentId===context.recommendedId)return Object.freeze({type:'keep'});
  const current=context.candidates.find(q=>q.id===context.currentId);
  const recommended=context.candidates.find(q=>q.id===context.recommendedId);
  const downgrade=current?.bandwidth!=null&&recommended?.bandwidth!=null&&recommended.bandwidth<current.bandwidth;
  return Object.freeze({type:'switch',id:context.recommendedId,urgency:downgrade?'responsive':'buffered'});
}

export function qualitySelection(context:QualitySelectionContext,decision:QualitySelectionDecision|undefined):Readonly<{id:string;urgency:'buffered'|'responsive'}> {
  const fallback=defaultQualitySelection(context);
  const value=decision?.type==='keep'||decision?.type==='switch'&&context.candidates.some(q=>q.id===decision.id)&&(decision.urgency===undefined||decision.urgency==='buffered'||decision.urgency==='responsive')?decision:fallback;
  if(value.type==='switch')return Object.freeze({id:value.id,urgency:value.urgency??'buffered'});
  return Object.freeze({id:context.candidates.some(q=>q.id===context.currentId)?context.currentId!:context.recommendedId,urgency:'buffered'});
}

/** Shaka applies safeMargin relative to the playhead when a deferred clear
 * actually runs. Its public API cannot pin removal to an absolute segment
 * boundary, so preserve buffered media for every requested urgency. */
export function qualitySwitchBuffer():Readonly<{clearBuffer:boolean;safeMargin:number}> {
  return Object.freeze({clearBuffer:false,safeMargin:0});
}

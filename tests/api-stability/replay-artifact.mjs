// SPDX-License-Identifier: Apache-2.0
// Test-only complete input artifact. Production sanitized diagnostics are not this schema.
import assert from 'node:assert/strict';
import {replayComposed,validateHistory} from './composed-replay-harness.mjs';
const maximumBytes=1024*1024;
function actions(value){
 const history=validateHistory(value);
 for(const action of history)for(const [key,item]of Object.entries(action)){
  if(key==='type'||key==='kind'||key==='lane')continue;
  if(key==='success'){if(typeof item!=='boolean')throw Error('Invalid Boolean');}
  else if(typeof item!=='number'||!Number.isFinite(item)||item<0||item>Number.MAX_SAFE_INTEGER)throw Error('Invalid numeric DTO');
 }
 return history;
}
export async function recordReplay(history){const recorded=actions(history);return {schema:'demuxe-test-replay',version:1,fixture:'source-effect-resource-v1',actions:recorded,expected:await replayComposed(recorded,{recordInputs:true})};}
export function encodeReplay(artifact){const text=JSON.stringify(artifact);if(Buffer.byteLength(text)>maximumBytes)throw Error('Replay byte bound exceeded');return text;}
export function decodeReplay(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>maximumBytes)throw Error('Replay byte bound exceeded');
 const dto=JSON.parse(text);if(!dto||Object.keys(dto).sort().join(',')!=='actions,expected,fixture,schema,version'||dto.schema!=='demuxe-test-replay'||dto.version!==1||dto.fixture!=='source-effect-resource-v1')throw Error('Unknown replay schema');
 dto.actions=actions(dto.actions);return dto;
}
export async function replayArtifact(text){const dto=decodeReplay(text),actual=await replayComposed(dto.actions,{recordInputs:true});assert.deepEqual(actual,dto.expected,'exact recorded DTOs and observations');return actual;}

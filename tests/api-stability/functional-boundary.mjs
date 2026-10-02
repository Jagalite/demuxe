// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {checkFunctionalCore} from '../../scripts/check-functional-core.mjs';

function fixture(t,files){
  const rootDir=mkdtempSync(path.join(tmpdir(),'demuxe-functional-boundary-'));
  t.after(()=>rmSync(rootDir,{recursive:true,force:true}));
  for(const [name,source]of Object.entries(files)){const file=path.join(rootDir,name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,source);}
  return checkFunctionalCore({rootDir});
}
const core=source=>({'src/internal/machine/reducer.ts':source});
const rejected=(diagnostics,code)=>assert.ok(diagnostics.some(item=>item.code===code),JSON.stringify(diagnostics));

test('pure transitions, local mutation, type-only DTOs and effect-shaped keys pass',t=>{
  const diagnostics=fixture(t,{
    ...core(`import {type Mode} from '../../types.js';
      import {increment} from './math.js';
      export type State={mode:Mode; count:number};
      // fetch, Promise and setTimeout in comments are not references.
      export function step(state:State){
        const values:number[]=[];values.push(increment(state.count));
        const next={...state,count:Math.max(0,values[0])};next.count+=1;
        return {state:next,effect:{fetch:'asset',setTimeout:20,Promise:'label'}};
      }`),
    'src/internal/machine/math.ts':'export function increment(value:number){return value+1;}',
    'src/types.ts':"export type Mode='native'|'software'; export type Unrelated=Promise<void>;",
  });
  assert.deepEqual(diagnostics,[]);
});

for(const [name,source,code]of [
  ['fetch alias','const request=fetch;export function step(){return request("/");}','ambient'],
  ['global alias','const host=globalThis;export function step(){return host.fetch("/");}','ambient'],
  ['declared host','declare const host:{fetch:()=>void};export function step(){host.fetch();}','ambient-declaration'],
  ['shorthand global','export function step(){return {fetch};}','ambient'],
  ['timer','export function step(){setTimeout(()=>{},1);}','ambient'],
  ['clock','export function step(){return Date.now();}','ambient'],
  ['random alias','const math=Math;export function step(){return math.random();}','nondeterminism'],
  ['random destructuring','const {random:next}=Math;export function step(){return next();}','nondeterminism'],
  ['computed random destructuring','const {["random"]:next}=Math;export function step(){return next();}','nondeterminism'],
  ['computed random','export function step(key:string){return Math[key]();}','nondeterminism'],
  ['promise type','export type State={work:Promise<void>};','host-type'],
  ['qualified promise type','export type State={work:globalThis.Promise<void>};','host-type'],
  ['controller','export function step(){return new AbortController();}','ambient'],
  ['async function','export async function step(){return 1;}','async'],
  ['module counter','let count=0;export function step(){return ++count;}','module-state'],
  ['module object write','const state={count:0};export function step(){return ++state.count;}','persistent-write'],
  ['module collection alias','const values:number[]=[];export function step(){const alias=values;alias.push(1);}','persistent-write'],
  ['input mutation','export function step(state:{count:number}){state.count++;return state;}','persistent-write'],
  ['object assign input','export function step(state:{count:number}){Object.assign(state,{count:1});return state;}','persistent-write'],
  ['constructor escape','export function step(){return ({}).constructor.constructor("return globalThis")();}','reflection'],
  ['dynamic import','export function step(){return import("./helper.js");}','dynamic-import'],
])test(`rejects ${name}`,t=>rejected(fixture(t,core(source)),code));

test('runtime import escapes are rejected even when re-exported through a core helper',t=>{
  rejected(fixture(t,{
    ...core("export {step} from './helper.js';"),
    'src/internal/machine/helper.ts':"export {step} from '../effects/runtime.js';",
    'src/internal/effects/runtime.ts':'export function step(){return 1;}',
  }),'import-boundary');
});
test('runtime import from the shared DTO module is rejected',t=>{
  rejected(fixture(t,{...core("import {VALUE} from '../../types.js'; export const state=VALUE;"),'src/types.ts':'export const VALUE=1;'}),'import-boundary');
});
test('type imports cannot escape into the shell',t=>{
  rejected(fixture(t,{...core("export type State=import('../effects/runtime.js').State;"),'src/internal/effects/runtime.ts':'export type State={id:number};'}),'import-boundary');
});
test('a shared type alias cannot hide an asynchronous handle',t=>{
  rejected(fixture(t,{...core("import type {Alias} from '../../types.js'; export type State={value:Alias};"),'src/types.ts':'type Work={work:Promise<void>}; export type Alias=Work;'}),'non-data-type');
});
test('a shared DTO cannot hide a callback',t=>{
  rejected(fixture(t,{...core("import type {Source} from '../../types.js'; export type State={source:Source};"),'src/types.ts':'export type Source={read:()=>number};'}),'non-data-type');
});
test('data-only type aliases do not allow a transitive source import escape',t=>{
  rejected(fixture(t,{...core("import type {Alias} from '../../types.js'; export type State={value:Alias};"),'src/types.ts':"export type Alias=import('./hidden.js').Hidden;",'src/hidden.ts':'export type Hidden={count:number};'}),'type-boundary');
});
test('shared import aliases cannot hide a transitive source dependency',t=>{
  rejected(fixture(t,{...core("import type {Alias} from '../../types.js'; export type State={value:Alias};"),'src/types.ts':"import type {Hidden} from './hidden.js'; export type Alias=Hidden;",'src/hidden.ts':'export type Hidden={count:number};'}),'type-boundary');
});
test('a local binding named like a browser API is not an ambient reference',t=>{
  assert.deepEqual(fixture(t,core('export function step(fetch:number){const document={value:fetch};return document.value+1;}')),[]);
});
test('rebinding a local alias or a scalar parameter does not mutate the caller',t=>{
  assert.deepEqual(fixture(t,core('const EMPTY:number[]=[]; export function step(count:number){count++;let values=EMPTY;values=[];return {values,count};}')),[]);
});
for(const method of ['freeze','seal','preventExtensions']){
  test(`${method} accepts a fresh output clone`,t=>{
    assert.deepEqual(fixture(t,core(`export function step(state:{count:number}){const next={...state,count:state.count+1};return Object.${method}(next);}`)),[]);
  });
  test(`${method} rejects a caller-owned object`,t=>{
    rejected(fixture(t,core(`export function step(state:{count:number}){return Object.${method}(state);}`)),'persistent-write');
  });
  test(`${method} rejects a module-owned object`,t=>{
    rejected(fixture(t,core(`const state={count:0};export function step(){return Object.${method}(state);}`)),'persistent-write');
  });
}
test('missing or empty core directories fail closed',t=>{
  rejected(fixture(t,{'src/types.ts':'export type State=number;'}),'missing-core');
});

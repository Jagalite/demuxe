// SPDX-License-Identifier: Apache-2.0
export interface MetadataBudgetState {readonly reads:number;readonly bytes:number;readonly reservedBytes:number;readonly batches:number;readonly active:number;readonly processingMs:number;readonly processingSince:number|null;}
export const initialMetadataBudget=():MetadataBudgetState=>({reads:0,bytes:0,reservedBytes:0,batches:0,active:0,processingMs:0,processingSince:null});
export function metadataParseMs(s:MetadataBudgetState,now:number):number{return s.processingMs+(s.processingSince===null?0:Math.max(0,now-s.processingSince));}
export function metadataParseAvailable(s:MetadataBudgetState,now:number):boolean{return metadataParseMs(s,now)<50;}
export function metadataReadsAvailable(s:MetadataBudgetState,count:number):boolean{return Number.isSafeInteger(count)&&count>=0&&s.reads+count<=8;}
export function admitMetadataTransfer(s:MetadataBudgetState,reads:number,bytes:number,now:number):MetadataBudgetState{
 if(!metadataParseAvailable(s,now)||s.batches>=8||!metadataReadsAvailable(s,reads)||!Number.isSafeInteger(bytes)||bytes<0||s.reservedBytes+bytes>512*1024)return s;
 return {...s,reads:s.reads+reads,reservedBytes:s.reservedBytes+bytes,batches:s.batches+1,active:s.active+1,processingMs:metadataParseMs(s,now),processingSince:null};
}
export function recordMetadataBytes(s:MetadataBudgetState,bytes:number):MetadataBudgetState{return Number.isSafeInteger(bytes)&&bytes>=0&&s.bytes+bytes<=s.reservedBytes?{...s,bytes:s.bytes+bytes}:s;}
export function finishMetadataTransfer(s:MetadataBudgetState,now:number):MetadataBudgetState{return s.active>0?{...s,active:s.active-1,processingSince:s.active===1?now:null}:s;}

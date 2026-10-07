// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertNativeFilePlayback} from './shaka-package-evidence.mjs';
function fixture(recovery=false){
 const open={at:10,sourceId:1,planId:'native-direct'};
 const played={at:2300,sourceId:1,mode:'native',pendingOperation:null,status:'playing',planId:recovery?'native-remux':'native-direct',backendPath:'native',backendPlan:recovery?'remux':'direct',output:{outputVerified:true,videoPresented:true,audioProgress:true},runtime:'pthread',remuxTransport:'pthread',attempts:[{mode:'native',outcome:'skipped',reason:'native-direct: This source policy requires controlled remux transport'},{mode:'native',outcome:'selected',reason:'native-remux: Playback requirements and actual startup accepted'}],verifications:[{phase:'first-play',started:20,finished:2020,budget:2000,plan:'native-direct',automatic:true,sourceKind:'remote',nativeRemux:'auto',error:recovery?{name:'StartupEvidenceTimeout',message:'Native output evidence timed out',stage:'output',evidenceTimeout:true}:null}]};
 return {open,played};
}
test('accepts direct output and exactly evidenced remote output-timeout recovery',()=>{
 for(const recovery of [false,true]){const {open,played}=fixture(recovery);assert.equal(assertNativeFilePlayback(open,played),recovery?'remux-after-output-timeout':'direct');}
});
for(const [name,change] of [
 ['unobserved recovery',f=>f.played.verifications=[]],
 ['unrelated decode failure',f=>f.played.verifications[0].error.name='PlayerError'],
 ['preparation timeout',f=>f.played.verifications[0].error.stage='preparation'],
 ['early timeout',f=>f.played.verifications[0].finished=1000],
 ['changed budget',f=>f.played.verifications[0].budget=1500],
 ['prior-operation timeout',f=>f.played.verifications[0].started=0],
 ['unfinished verification',f=>delete f.played.verifications[0].finished],
 ['multiple failures',f=>f.played.verifications.push({...f.played.verifications[0]})],
 ['different source',f=>f.played.sourceId=2],
 ['unfinished operation',f=>f.played.pendingOperation='play'],
 ['missing video output',f=>f.played.output.videoPresented=false],
 ['missing audio output',f=>f.played.output.audioProgress=false],
 ['non-native fallback',f=>f.played.planId='software'],
 ['unaccounted route failure',f=>f.played.attempts.push({outcome:'failed'})],
 ['transport mismatch',f=>f.played.remuxTransport='asyncify'],
 ['remux selected before play',f=>f.open.planId='native-remux'],
 ['local recovery classified as remote',f=>f.played.verifications[0].sourceKind='local'],
 ['pinned recovery',f=>f.played.verifications[0].automatic=false],
 ['direct with a hidden timeout',f=>{f.played.planId='native-direct';f.played.backendPlan='direct';}],
])test('rejects '+name,()=>{const f=fixture(true);change(f);assert.throws(()=>assertNativeFilePlayback(f.open,f.played));});

// SPDX-License-Identifier: Apache-2.0
import {execFileSync} from 'node:child_process';
export function remainingProcesses(ids) {
  if(!ids.length)throw Error('No observed Chrome process identities');
  try{return execFileSync('ps',['-o','pid=','-p',ids.join(',')],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim().split(/\s+/).filter(Boolean).map(Number);}
  catch(error){if(error.status===1&&!String(error.stdout??'').trim())return [];throw error;}
}
/** Actual process exit is the retirement gate; an IPC close acknowledgment can
 * arrive late after the process has exited. Never terminate unrelated processes. */
export async function closeBrowserObserved(browser,ids,{remaining=remainingProcesses,delay=ms=>new Promise(r=>setTimeout(r,ms)),attempts=150}={}) {
  let acknowledged=false,closeError;
  browser.close().then(()=>{acknowledged=true;},error=>{closeError=String(error);});
  let alive=remaining(ids);
  for(let i=0;alive.length&&i<attempts;i++){await delay(100);alive=remaining(ids);}
  if(alive.length)throw Error('Chrome processes remain after teardown: '+alive.join(','));
  return {trackedProcessIDs:ids,remainingProcessIDs:alive,playwrightCloseAcknowledged:acknowledged,...(closeError?{closeError}:{})};
}

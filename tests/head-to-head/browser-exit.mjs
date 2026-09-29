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

async function deadline(operation, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error(`${label} timed out`)), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

/** Discovery failures must still close the owned browser, and must not qualify
 * process retirement without evidence. Bound both discovery and fallback close. */
export async function closeTestBrowser(browser, family, {timeoutMs = 15000} = {}) {
  if (family === 'firefox') {
    await deadline(() => browser.close(), timeoutMs, 'Firefox teardown');
    return {playwrightCloseAcknowledged: true};
  }
  let ids, discoveryError;
  try {
    const session = await deadline(() => browser.newBrowserCDPSession(), timeoutMs, 'Chrome CDP session');
    const info = await deadline(() => session.send('SystemInfo.getProcessInfo'), timeoutMs, 'Chrome process discovery');
    ids = info.processInfo.map(p => p.id);
    await deadline(() => session.detach(), timeoutMs, 'Chrome CDP detach');
  } catch (error) { discoveryError = error; }

  let result;
  try {
    if (ids?.length) result = await closeBrowserObserved(browser, ids);
    else await deadline(() => browser.close(), timeoutMs, 'Chrome fallback teardown');
  } catch (error) {
    if (discoveryError) throw new AggregateError([discoveryError, error], 'Chrome discovery and teardown failed');
    throw error;
  }
  if (discoveryError) throw discoveryError;
  if (!ids?.length) throw Error('No observed Chrome process identities');
  return result;
}

// SPDX-License-Identifier: Apache-2.0
// Keep the shared startup deadline while distinguishing clock progress from
// missing/quiet audio. Neither clock progress nor quiet audio passes the oracle.
export async function waitInitialOutput(page, {audio, stage, audioTimeout, budgetMs=10000, now=()=>performance.now()}) {
  const deadline=now()+budgetMs;
  stage('initial-playback');
  await page.waitForFunction(()=>api.snapshot().position>.65,undefined,{timeout:budgetMs});
  stage('initial-output');
  if(!audio)return;
  try {
    await page.waitForFunction(()=>api.snapshot().audio.some(a=>a.rms>.015),undefined,{timeout:Math.max(1,deadline-now())});
  } catch(error) {
    if(error.name!=='TimeoutError')throw error;
    audioTimeout(String(error));
    throw Error('Marked left/right audio missing or incorrect',{cause:error});
  }
}

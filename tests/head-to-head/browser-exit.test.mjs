// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {closeTestBrowser,waitForPageWorkers} from './browser-exit.mjs';

const pending = () => new Promise(() => {});
for (const stage of ['session', 'processes', 'detach']) {
  for (const failure of ['reject', 'stall']) {
    test(`${failure} during Chrome ${stage} still attempts close and fails qualification`, {timeout: 2000}, async () => {
      let closed = 0;
      const fail = failure === 'stall' ? pending : async () => { throw Error(`${stage} failed`); };
      const session = {
        send: stage === 'processes' ? fail : async () => ({processInfo: []}),
        detach: stage === 'detach' ? fail : async () => {},
      };
      const browser = {
        newBrowserCDPSession: stage === 'session' ? fail : async () => session,
        close: async () => { closed++; },
      };
      await assert.rejects(closeTestBrowser(browser, 'chrome', {timeoutMs: 20}), failure === 'stall' ? /timed out/ : /failed/);
      assert.equal(closed, 1);
    });
  }
}

test('stalled fallback close is bounded and preserves both errors', {timeout: 2000}, async () => {
  const original = Error('disconnected');
  let closed = 0;
  await assert.rejects(closeTestBrowser({
    newBrowserCDPSession: async () => { throw original; },
    close: () => { closed++; return pending(); },
  }, 'chrome', {timeoutMs: 20}), error => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors[0], original);
    assert.match(error.errors[1].message, /fallback teardown timed out/);
    return true;
  });
  assert.equal(closed, 1);
});

test('empty process inventory closes but cannot qualify retirement', async () => {
  let closed = 0;
  await assert.rejects(closeTestBrowser({
    newBrowserCDPSession: async () => ({send: async () => ({processInfo: []}), detach: async () => {}}),
    close: async () => { closed++; },
  }, 'chrome'), /No observed Chrome process identities/);
  assert.equal(closed, 1);
});

for (const [family, label] of [['firefox', 'Firefox'], ['webkit', 'WebKit']]) {
  test(`${label} close acknowledgement succeeds and a stalled close times out`, {timeout: 2000}, async () => {
    assert.deepEqual(await closeTestBrowser({close: async () => {}}, family), {playwrightCloseAcknowledged: true});
    await assert.rejects(closeTestBrowser({close: pending}, family, {timeoutMs: 20}), new RegExp(`${label} teardown timed out`));
  });
}


test('worker cleanup accepts delayed browser retirement and retains a bounded live-worker failure',async()=>{
 for(const closesAt of [0,800,Infinity]){
  let time=0;const page={workers:()=>time<closesAt?[{url:()=>'/owned-worker.js'}]:[]};
  const receipt=await waitForPageWorkers(page,{timeoutMs:1000,now:()=>time,delay:async ms=>{time+=ms;}});
  assert.equal(receipt.elapsedMs,closesAt===Infinity?1000:closesAt);
  assert.deepEqual(receipt.remainingWorkerURLs,closesAt===Infinity?['/owned-worker.js']:[]);
 }
});

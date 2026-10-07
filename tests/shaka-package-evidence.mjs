// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';

// Ordinary-file playback must stay native and never acquire Shaka. A remote
// direct trial may recover only after the existing two-second output deadline.
export function assertNativeFilePlayback(open, played) {
  assert.equal(open.planId, 'native-direct');
  assert.equal(played.mode, 'native');
  assert.ok(open.sourceId != null && played.sourceId === open.sourceId);
  assert.equal(played.pendingOperation, null);
  assert.equal(played.status, 'playing');
  assert.ok(played.output?.outputVerified && played.output.videoPresented && played.output.audioProgress);
  assert.ok(Number.isFinite(open.at) && Number.isFinite(played.at) && played.at >= open.at);
  const records = played.verifications.filter(row => row.phase === 'first-play');
  assert.ok(records.length > 0 && records.every(row => Number.isFinite(row.started) && Number.isFinite(row.finished) && row.started >= open.at && row.finished >= row.started && row.finished <= played.at));
  const failures = records.filter(row => row.error);
  assert.equal(played.backendPath, 'native');
  if (played.planId === 'native-direct') {
    assert.equal(played.backendPlan, 'direct');
    assert.equal(failures.length, 0);
    return 'direct';
  }
  assert.equal(played.planId, 'native-remux');
  assert.equal(played.backendPlan, 'remux');
  assert.equal(failures.length, 1);
  const failure = failures[0];
  assert.equal(failure.plan, 'native-direct');
  assert.equal(failure.automatic, true);
  assert.equal(failure.sourceKind, 'remote');
  assert.equal(failure.nativeRemux, 'auto');
  assert.equal(failure.budget, 2000);
  assert.ok(failure.finished - failure.started >= failure.budget);
  assert.deepEqual(failure.error, {name:'StartupEvidenceTimeout', message:'Native output evidence timed out', stage:'output', evidenceTimeout:true});
  const skipped = played.attempts.findIndex(row => row.mode === 'native' && row.outcome === 'skipped' && row.reason === 'native-direct: This source policy requires controlled remux transport');
  const selected = played.attempts.findIndex(row => row.mode === 'native' && row.outcome === 'selected' && row.reason === 'native-remux: Playback requirements and actual startup accepted');
  assert.ok(skipped >= 0 && selected > skipped && played.attempts.every(row => row.outcome !== 'failed'));
  assert.equal(played.remuxTransport, played.runtime);
  assert.ok(['pthread','jspi','asyncify'].includes(played.runtime));
  return 'remux-after-output-timeout';
}

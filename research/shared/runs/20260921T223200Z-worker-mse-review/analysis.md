<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Worker MSE review fixes

Reviewed production commit `78385fc21156f798a23e500f60e7a80aad421133`. The review covered MSE owner/controller lifecycle, selected-track admission, progressive delivery, queue/backpressure behavior and the JSPI producer boundary. Two concrete lifecycle defects were reproduced and repaired:

1. A delayed recovery play request could override an explicit pause. The controller now retains playback intent, forwards it to the owner, and acknowledges suppressed recovery play. A pause that interrupts an already pending recovery play is treated as intentional cancellation rather than a playback failure.
2. An owner-error callback could begin asynchronous shutdown before destroy. The later destroy previously saw no worker and returned early. It now awaits the same pending shutdown promise before clearing the element.

Three deterministic controller regressions fail against the reviewed commit and pass after the fixes. The browser recovery-pause regression also fails against the reviewed commit. Final validation passed 25 controller/fragment/buffering contracts, nine existing worker lifecycle cases, and both JSPI/pthread recovery-pause cases. The final browser check verifies both Playwright worker retirement and Chrome's actual target list. The new deterministic tests are included in CI. The scoped license/dependency check passed.

## Remaining observation

The 1.5-second Playwright retirement observation intermittently retained an MSE-worker entry after destroy; a diagnostic execution probe timed out. A trial removing worker self-close did not resolve it and was reverted. Repeated diagnostic runs and the final run passed, including Chrome target retirement, but this does not establish the cause of the earlier observations or prove an intermittent issue fixed. Failed runs are retained in logs. This observation was already present in the original production qualification; it is distinct from the deterministic pending-shutdown-promise defect repaired here.

No routing defaults, source profiles, remux construction, or throughput claims changed. Browser qualification uses the scoped maintained source and the previously qualified remux Wasm. This follow-up does not claim a newly built exact release package or new performance qualification. Earlier research snapshots remain unchanged.

Final browser results: [result.json](../../../../results/worker-mse-review/2026-09-21T22-31-48.224Z/result.json).

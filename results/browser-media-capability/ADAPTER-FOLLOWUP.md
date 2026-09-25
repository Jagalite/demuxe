# Evidence adapters follow-up

Query serialization completeness and negative-query authority are now separate.
Original Matroska codec-parameter negatives remain unknown across both MIME aliases;
MSE and original-file evidence stay separate. Runtime adapters select observed APIs,
not user-agent codec tables. Audio strength distinguishes presence, decoded bytes,
and consumed PCM; presence never asserts audioDecoded.

Validation: 58 focused tests passed. The 51-case Chrome/Firefox/Playwright-WebKit
matrix passed 50 cases; the remaining pinned-Native AC3 test expected rejection
at open instead of permitted-play verification. After correcting that assertion,
all three Chrome AC3 cases passed, including pinned rejection without outputVerified.
The forced-negative Matroska case passed in all three browsers. Late-answer regression,
TypeScript, core-boundary and whitespace checks passed. Full build remains blocked
by the existing unrelated SPDX violation in experiments/chrome-browser-cpu/diagnose.mjs.

Real Safari 26.5.2 refused WebDriver session creation: Allow remote automation is
disabled. Settings were not changed. Playwright WebKit is not Safari qualification.
See EVIDENCE-SUMMARY.json for compact results and hashes of locally retained full runs.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# 1.1.0-rc.3 release candidate

RC3 corrects the installed-consumer startup observer exposed by RC2's Linux Firefox release gate. Production playback policy is unchanged. Every package version and internal Demuxe peer pin advances to `1.1.0-rc.3`; the pushed RC2 tag remains immutable.

The observer now distinguishes the existing Firefox-specific 500 ms first-play recovery deadline from the ordinary 1,500 ms deadline. It requires the MSE worker only when the selected backend reports worker-owned MSE. Direct startup now records case-scoped HTTP server responses, as ASS startup already did, so Firefox's worker-import visibility gap does not masquerade as a missing engine module. Successful HTTP proof, selected worker/asset identities, source continuity, playback output, subtitle output, and timing checks remain mandatory.

Focused regressions cover both direct and ASS recovery, wrong deadlines, early fallback, missing workers, missing/failed module responses, changed browser identity and invalid MSE ownership. All 34 startup tests passed on Node 22 and 24. The complete 43-test catalogue/rate/startup guard selection and 19 Python tag-release guards passed. The failed Linux ASS receipt passes offline replay with the corrected classifier; removing its original timeout proof still fails. This replay is diagnostic evidence, not fresh browser qualification.

Live Chrome and Firefox each passed `automatic-local`, `automatic-ass` and `native-no-isolation` with the revised observer against the previously qualified RC2 archive. These six checks validate the observer change, not a new RC3 archive. Logs and the replay record are retained under `build/rc3-*` in the main checkout.

The new tag must pass the full clean Linux build, installed consumers, streaming, optional runtime, complete catalogue comparison, all three browser boundary suites, and the 12-shard installed API matrix before publication. RC2's local archive receipts do not qualify RC3 bytes. The release pipeline also requires the provider collection before publishing the GitHub prerelease, and stages only the verified archive for npm `latest` approval.

RC2's 17 documented catalogue limits, partial API coverage, automated-WebKit scope, and physical HDR/audio limitations remain applicable. No additional performance, endurance or production-readiness claim is made.

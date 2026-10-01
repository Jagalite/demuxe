<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Final non-isolated package qualification

`qualification.json` owns the immutable archive/source identities and the 99 passing
browser checks. The runtime and source archives remain under the recorded external
paths; reports verify the installed public entry point and consumed asset hashes.

The archive is source commit `13643784`, tag `qualification/nonisolated-20260930-03`.
All tests use finite synthetic fixtures with separately generated references.
Full CPU benchmarks and a universal format/browser claim are outside this gate.

`rejected/` retains earlier package failures and browser assertions. The build-path
leaks were fixed and cleanly rebuilt. The Native-direct assertion now distinguishes
HEAD metadata from engine downloads. Disabled cooperative runtimes no longer report
unrequested private plans as missing deployments. AudioContext checks require a
bounded acknowledgement and record latency; the fixed-delay failure remains retained.
The first portability-probe log includes a harness Path/string error, corrected in
its second run; both negative controls then detected the removed safeguards.

The latest-main merge preview is source-only. Its TypeScript/55-test result does not
change the separately qualified archive's source identity. The isolated engine hash
receipt connects the package bytes to the previously accepted six-case regression.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Append-window filtering receives every source byte and produces a reported[1,7] range, but a seek to1.5s inside that range displays the source4s RAP picture rather than the required1.5s picture. All35tested interiorpictures aftertheRAP are exact. Stop using this unqualified codedwindow as an exact clip; buffer ranges andEOF do not prove dependency-correct output.

Correctness: AVC/AAC source,48-frame GOP, appendWindow[1,7],315345sourcebytes delivered.35interiorfullimages match independent native reference andEOF reaches7s. Adverse non-RAP leftboundary: seekcurrentTime1.5 completes but observedfullhash1a5f71... equals sourceframe48, notrequiredsourceframe17hashf14b65.... Invalidwindow assignment rejects andfullsource reappend restores exact.3s image; cleanup passes. Rawprobe passedboolean only coversdeclaredinterior/filtering checks, notfailededgefidelity; acceptance explicitly retains distinction.

Performance: Literal source report already says allinputbytes aretransported/parsed. No transport-saving claim andno benchmark after dependency-sensitive wrong-picture finding.

Next/reopen: Reopen with a keyframe/dependency admission or preroll-preserving presentationtrim contract, then verify everyrequestededgepicture andselectedaudio. Preserve codedfiltering capability as positive; do not treatreportedbufferedrange as exact requestedcontent.

Bounded research result, not production or release admission.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Share immutable compiled code, not live playback state

Actual maintained native-remux baseline and isolated immutableModule reuse hook now compare full native-reference RGBA at three forward/backward seeks perplayer in cold/repeat/concurrent cases:15exact samples pervariant. Concurrent gain video and independently blackvideo have differentreferencehashes, yet both remainexact, exercising independentmutable ownership. Onecompiledmodule serves allcandidateinstances; canceledpopulation consumer rejects whileliveconsumer opens; sourcechanges selectnewfile; everycase destroysplayers and assertszeroworkers. Initial extendedharness inheritedtwoinstances startupcount and failed aftercorrectpixels; boundedstartup+threeseek ownercount2–5 replacesobsoletecount only, retaininginitialnegative. Newtimings arediagnostic outputqualification, notbenchmark. Existing sevenpaired complete-startup gate remains14.1044%point saving, bootstrap95[9.8870,18.3907]% belowrequired10%lowerbound, therefore performancefailed/inconclusive remains. No productioncache/admission edits.

Next: Scoped module-sharing research gates complete with exactoutputs/ownership but no acceptedminimum10%startupbenefit. Reopen only for a specified workload or changed cacheimplementation with newlydeclared performance gate; productioncacheauthority remains separate.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual unchanged PCMOutput renders all48000 float samples exactly from symbolic zero spans, retaining the three nonzero FIR tail samples. Media-clock versus underrun, epoch reset, close and nonlinear noise materialization controls pass. Explicit cached PCM payload1040bytes versus192000bytes meets8x reduction criterion, but complete scan/descriptor/materialize/playback median2.9885ms versus2.592417ms (1.152785x) fails1.10 time ceiling.

Stop this post-filter scan-to-spans-to-materialized-ring cost profile. Reopen with upstream certified symbolic intervals or a consumer that avoids ring materialization; this prototype does not avoid initial decoding/filter allocations, and explicit retained payload is not total process memory.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

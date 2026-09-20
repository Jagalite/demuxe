<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Route simple SubRip captions to Native text tracks

Disposition: **pursue**. correctness: **passed**, performance: **passed**.

Actual strictplain SRT→VTT→native showingTextTrack owner comparedwith real libassfont/ASS/bitmapoverlay owner on same nativevideo. Existing hand-authored interval/text contract retained: multiline/overlap activecues exact at5forward/backwardseeks; threeparsernegativesreject. Generatedrichbaselineprogram exactlymatches handauthoredASS and its4distinct glyphstates matchuntimed reference. This is plaintext/timing equivalence, not identicalglyphstyle or anASS-to-text approximation. Wholecoldsubtitle/videoBlob/load/font/worker/sourceconvert/5seek+rAF/render/check/teardown task: native84.963ms vsrich164.954ms, saving48.49% bootstrap95[44.63261769425173, 52.13569119591346], passeslower9510%gate. Native0richworkers vsbaseline1; no totalmemory/CPUenergyclaim. Existing actualnative-direct/remux timelinebias correctness retained; embedded/styled captions excluded.

Next: Scoped strict externalplaintext caption research gates complete. Integrate only with explicit subset admission/track/source ownership and existing remuxbias semantics; no substitution for requested richstyle or embedded extraction.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T212910Z-plain-owner/analysis.md)

[Fixture provenance metadata amendment](../../shared/runs/20260919T213300Z-presentation-provenance-amendment/analysis.md); output and gate decisions unchanged.

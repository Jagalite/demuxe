<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Larger fixture prepared correctly but linear select expression exceeds parser depth; setup diagnostic, not timing result.

Run directory timestamp prefixes were mistakenly allocated ahead of the actual wall clock. They are immutable allocation labels, not execution timestamps; recorded_at_utc is the actual registration time. Candidate measurements are process monotonic durations. Original commands and failed variants remain preserved.

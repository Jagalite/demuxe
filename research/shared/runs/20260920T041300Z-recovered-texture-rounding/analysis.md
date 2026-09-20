<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Strict oracle mismatch quantified: native171/84 versus CPU170/85, max1channel. Preserve strict byte-exact failed profile.

Run directory timestamp prefixes were mistakenly allocated ahead of the actual wall clock. They are immutable allocation labels, not execution timestamps; recorded_at_utc is the actual registration time. Candidate measurements are process monotonic durations. Original commands and failed variants remain preserved.

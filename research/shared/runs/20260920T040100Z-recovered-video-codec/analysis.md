<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Original mixed-profile smart cut fails189229 channel bytes; R076360p first pass succeeded.

Run directory timestamp prefixes were mistakenly allocated ahead of the actual wall clock. They are immutable allocation labels, not execution timestamps; recorded_at_utc is the actual registration time. Candidate measurements are process monotonic durations. Original commands and failed variants remain preserved.

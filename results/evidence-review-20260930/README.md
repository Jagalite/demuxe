# Remaining evidence review — September 30, 2026

This checkpoint retains selected historical reports, not fresh playback results.
The [index](index.json) records each selected campaign, its scope and the SHA-256
of every committed artifact. Complete Chrome/Firefox pairs and distinct package
archives are preserved. Repeated runs and partial successes are not promoted to
qualification. Deliberate rejection tests remain separate from actual failures.

The two DTS-HD CPU campaigns were interrupted or blocked. The older release
check failed because a temporary audio-adaptation source archive was missing.
The one-check API report contains a failed worker attempt and is diagnostic only.
None establishes a successful current release.

Screenshots, ignored request logs and binary media/runtime outputs remain local.
Original manifests describe full local captures, so this committed archive is
partial. See [retention policy](../../docs/COMPARISON-EVIDENCE-RETENTION.md).
The selected browser, source and package identities apply only to their recorded
snapshots; current codec/provider production gates remain open.

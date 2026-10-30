<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# MediaBunny and real FFmpeg backup qualification

Date: 2026-10-29. Scope: exact local AVC/AAC fixture compositions in Chrome155 and Firefox157, using the current public Player, maintained presentation/source workers, and a tracked archived FFmpeg remux pair. Playwright WebKit27.2 has a retained failed MSE audio observation described below. These results do not qualify a new production FFmpeg distribution or mpv playback.

The complete-file and incremental MediaBunny candidates each pass seven public-API cases. The receipts are [real-backup-file.json](../packages/provider-mediabunny/qualification/real-backup-file.json) and [real-backup-stream.json](../packages/provider-mediabunny/qualification/real-backup-stream.json). They bind presenter/worker/harness identities, the archived backup provenance, fixture hashes, served application-module hashes, asset acquisitions, decoded output and cleanup. No probe facts or backend factories are injected.

- Ordinary direct playback acquires neither optional worker nor FFmpeg assets.
- With both implementations deployed and no preference, the maintained default runs real FFmpeg, with positive fragment-production call counters. MediaBunny is not acquired.
- An explicit MediaBunny preference on an admitted source acquires its worker alone and produces fresh video and stereo audio.
- An authored AAC roll-distance variant outside the adapter's bounded profile actually reaches its worker and declines. Complete-file preparation returns the documented absent result; incremental preparation reports profile mismatch. The existing owner then runs real FFmpeg. Fresh video after seek, expected color and left/right tones pass.
- Corrupted declared MediaBunny bytes remain `ASSET_LOAD_FAILED` before any preparation worker is created. The available FFmpeg backup is not acquired.
- The same profile decline with the backup omitted reports `DEPLOYMENT_UNAVAILABLE`; it does not claim a backup or acquire undeclared FFmpeg assets.
- Denied controlled HTTP source access remains `SOURCE_PERMISSION`, with neither provider acquired.

All successful media cases confirm seek1.25 and subsequently decode a fresh frame beyond the target. The fixture's 440Hz left and660Hz right audio tones are observed from the media element after seek through a zero-gain Web Audio tap, and video color is checked. FFmpeg cases use the actual worker-owned MSE path on this Chrome build. Window-created Worker and object-URL handles retire on close/destroy; this instrumentation is not an independent census of every nested native/pthread worker. Full packet/PCM hash/extent, arbitrary source metadata, native-memory and larger-media claims remain outside this test.

## Tracked backup artifacts

The sparse checkout hid the archived binaries. `test/extract-backup-probe.mjs` reads only the two selected HEAD blobs into a separate destination, validates their pinned Git blob IDs and the research inventory's SHA-256/byte counts, preserves existing destination files, and checks basic exported packet-copy function names without instantiating the Wasm. The files are:

- `research/items/granular-engine-loading/evidence/20260921T162900Z-screen-01/snapshots/runtime/web/engine-remux/remux.mjs`:36045bytes, SHA-256 `ddc664c7e6c9c407f21b3053d0b126ed4555747ab7c61d246b5982cf9ea7fa12`.
- The matching `remux.wasm`:3013312bytes, SHA-256 `39dda29a4535b9e73d0fcd2357f7dee746d1597494758d5663ca85fd1f2fba19`.

The compound test identity is `sha256:d9295dd50bb400bdded7a56470f3c271e4337d68921db676bfa4bbe792c9e055`. The checked exports include open/probe/duration/codec/container/start/step/close/error. Their presence alone is not semantic ABI qualification; the subsequent real calls and output checks establish only the fixture envelope above. This probe does not test demuxer hints, adaptation, all codecs or mpv. Archive license metadata is retained as `NOASSERTION (retained per-file/component notices)`; no new redistribution/source-compliance approval is inferred. The binaries remain in the external probe directory and are not bundled into the MediaBunny package. [Provenance](../packages/provider-mediabunny/qualification/backup-archived-provenance.json) and [basic ABI](../packages/provider-mediabunny/qualification/backup-basic-abi.json) records are retained.

The test supplies an application-owned qualification map for the exact controlled candidates and complete browser-prepared binding. It does not modify the project's reviewed global qualification registry or let manifest offers self-qualify. The loopback server serves the exact pair and records its hashes; this adds no production loader/integrity mechanism.

## Fixture and test-server boundaries

The ordinary source is the retained synthetic 320×240 AVC, stereo48kHz AAC fixture. The decline variant changes the existing two-byte `roll` group distance from-1 to-2, leaving packet payloads, sample tables and timing untouched. The variant SHA-256 is `01b8e45ce708f944a3a3d75a2dcfc27c45d38255ecb7f9fdfda8bc27545f3684`. Qualification here is not a general assertion about every recovery-distance declaration or sample-exact preroll semantics.

Early route-interception attempts could not serve the nested source worker used by the worker-owned MSE controller. The current test owns a short-lived loopback HTTP server with COOP/COEP/CORP headers on worker/module responses, serves normal nested-worker requests, and closes it in `finally`. A first HTTP assertion also incorrectly expected complete-file profile decline to be an error message; the preparer correctly returns `undefined`, and the observer was corrected to check that protocol result. Those failed test-fixture receipts remain as `backup-route-interception-failed.json` and `backup-observer-assertion-failed.json`; they are not passing product qualification. No production fallback code changed during this milestone.

## Reproduction

From `packages/provider-mediabunny` in a full Demuxe checkout, with existing test tools and a built MP4 or MP4-stream candidate:

```sh
node test/extract-backup-probe.mjs /absolute/path/to/new-probe-directory
DEMUXE_PUBLIC_RUNTIME_CANDIDATE=/absolute/path/to/candidate \
DEMUXE_BACKUP_PROBE=/absolute/path/to/new-probe-directory \
DEMUXE_BROWSER_EVIDENCE=/absolute/path/to/receipt.json \
node test/browser-backup.mjs
```

Use each candidate separately. The extractor requires the pinned tracked artifacts; it does not download or rebuild FFmpeg. The harness starts/closes its own ephemeral localhost server. The source-profile and preparation-worker contracts also pass14 targeted tests. A refreshed incremental runtime/source archive passes correspondence and unused-format/Wasm closure checks with unchanged executable identity; generated Python caches stay excluded.

Still open: maintained production backup/source assembly, mpv and wider backup profiles, broader browser/device/source preservation, unresolved WebKit incremental A/V observation and prior direct-startup reliability, and final release qualification. The optional package remains private and publication guarded.

An [independently authored MOV fallback comparison](../packages/provider-mediabunny/qualification/reader-independent-mov-fallback-verification.json) adds one synthetic 48 kHz stereo AAC source generated by FFmpeg 8.1.2, with 440 Hz left and 660 Hz right tones. The guarded MediaBunny preparer declined its authored profile; the public Player then used the archived FFmpeg candidate. Local and controlled remote cases passed in Chrome 155 and Firefox 157, checking a 1.25-second seek, subsequent audio clock and both tones, provider acquisition, and window-owned worker/URL cleanup. The controlled remote server requires authorization and explicit byte ranges. The [fixture](../tests/fixtures/mediabunny-independent-aac-stereo.mov) is retained; the verifier checks its hash, all served deployment assets and 12 negative controls. These four selected cases use test-owned identities and do not establish full packet or PCM preservation, mpv behavior, broad MOV support, or production qualification. The prior SDK-authored MOV checks remain separate.

## Firefox and WebKit comparison

The same seven assertions now run with `DEMUXE_PUBLIC_BROWSER=chrome` (default), `firefox`, or `webkit`, against the retained source bytes without regenerating a browser-specific fixture. Firefox157 passes all seven cases for both the complete-file and incremental candidate. Receipts are `qualification/real-backup-firefox-file.json` and `qualification/real-backup-firefox-stream.json`; each binds the modified harness and all served application scripts. There is no reduced assertion set for another engine.

Playwright WebKit27.2 passes the direct A/V control, then fails the default real FFmpeg MSE case at the unchanged fresh-stereo assertion: both channels report zero RMS/tone values while the AudioContext is running, volume is1, the media element is unmuted and its main audio track is enabled. The source advances to its end during observation. Its diagnostic evidence includes real FFmpeg fragment calls, accepted MSE media and decoded video progress. This is `qualification/real-backup-webkit-stream-failed.json`, a failed qualification receipt; later cases were not executed.

This supplies the previously missing independent FFmpeg control: zero-valued Web Audio observation also occurs on the maintained FFmpeg MSE path, so that observation is not specific to MediaBunny. It does not establish audible output, binary-match the installed WebKit to upstream source, or qualify WebKit streaming A/V. No assertion or product fallback policy was weakened to make this comparison pass.

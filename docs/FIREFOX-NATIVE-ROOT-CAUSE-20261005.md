# Firefox local-file buffering: root cause and solution

> Historical investigation: observations and runtime identities refer to the recorded runs, not the current checkout. Diagnostic harnesses are optional and were not rerun for this archival commit. Some raw captures and external fixtures remain local; only selected supporting evidence is versioned.

The failure is caused by inconsistent availability state inside Firefox, exposed by a small difference between the media duration and the buffered range. The best practical Demuxe solution is its existing native packet-copy remux path through MediaSource. A fixed 250 ms delay is a scheduling workaround, not the underlying fix.

## Causal chain

1. Firefox handles a File/Blob URL with `FileMediaResource`. Once its size is known, it sends `NotifyDataEnded(NS_OK)`, but does not send the data-arrival notifications used by HTTP resources.
2. `ChannelMediaDecoder::NotifyDownloadEnded` marks the element suspended by cache, allowing the DOM to report `HAVE_ENOUGH_DATA` and fire `canplaythrough`. It does not recompute or dispatch the separate `mCanPlayThrough` value used by the decoder state machine. That value starts false. `DownloadProgressed`, reached through data-arrival notifications, is the path that normally updates it.
3. After a near-end seek, the decoded queues briefly need refilling. The reported buffered interval also ends before the reported duration. Firefox 146 reports duration 12.034 seconds for this source; Firefox 157 reports 12.011 seconds. The combined buffered range ends at 12.001 seconds. Both leave an interval that the buffering test considers missing.
4. The combination of low decoded data, low buffered data, and false `mCanPlayThrough` enters Firefox's buffering state. No further bytes can arrive for the complete local file, so the native 15-second buffering deadline releases it. Demuxe's unchanged 10-second output verification deadline expires first.

This explains why a `canplaythrough` event or `readyState === 4` is insufficient as a workaround: those DOM signals can disagree with the internal flag. The 250 ms delay gives the decoded queues time to fill, avoiding one condition of the buffering decision without correcting availability. Waiting for the target's video-frame callback did not prevent the failure.

The relevant sources are retained locally: [FileMediaResource.cpp](../results/firefox-native-root-cause-20261005/FileMediaResource.cpp), [Firefox 157 ChannelMediaDecoder.cpp](../results/firefox-native-root-cause-20261005/FIREFOX_157_0_RELEASE-ChannelMediaDecoder.cpp), [default-false flag](../results/firefox-native-root-cause-20261005/FIREFOX_146_0_RELEASE-ChannelMediaDecoder.h), and [buffering state machine](../results/firefox-native-resume-investigation-20261005/Firefox-146-MediaDecoderStateMachine.cpp). They were fetched from Mozilla's release-tag sources. The source of each cached file and its digest are recorded in the evidence manifest.

Mozilla's open [bug 1807968](https://bugzilla.mozilla.org/show_bug.cgi?id=1807968) describes the same class of near-end local/Blob buffering problem and notes the unset can-play-through flag. Its original trigger is a playback-rate change. Our seek/resume reproducer and controlled results independently establish the mechanism here; no upstream report or comment was submitted.

## Controlled confirmation

Separate Firefox 157 runs isolate availability notification behavior:

| Original fixture, single seek to 9 seconds | Blob URL | HTTP URL |
| --- | --- | --- |
| Download-complete notification | Yes | Yes |
| Logged can-play-through update to true | None | Yes |
| Entered buffering heuristics | Yes | No |
| Immediate resume | Stalls | Advances |

[Blob result](../results/firefox-native-root-cause-20261005/final-blob.json), [HTTP result](../results/firefox-native-root-cause-20261005/final-http.json), and their `final-blob.log.*` / `final-http.log.*` media logs retain the comparison. Both page-side fixture hashes match the original SHA256 `6c9cac6f4212f470d79a9f829f29ba459e6c3e401fab9feb6d757a10a507404c`.

A second intervention isolates the duration/range condition. A diagnostic copy aligns the declared MP4 durations with the 12.001-second buffered endpoint. Only nine header bytes change; all 360 video and 564 audio encoded packet payloads remain identical. In alternating trials, the aligned copy passes twice and the original fails twice. Each trial hashes the actual bytes inside the browser. [Trials](../results/firefox-native-root-cause-20261005/duration-aligned.json) and [identity/changed offsets](../results/firefox-native-root-cause-20261005/duration-aligned-identity.json) retain that proof. This deliberately changes declared media duration and is not a shipping transformation or a claim that the original media is invalid. Legitimate audio/video tail differences must be handled without waiting for nonexistent bytes.

## Recommended solution

For affected local-file playback in Firefox, prefer the already-admitted `native-remux` plan. It copies encoded packets into MediaSource packaging and retains browser decoding; no re-encoding or artificial seek delay is required. Firefox's file/network buffering heuristic is not the MSE buffering policy, so this avoids the faulty path. Keep other browsers and HTTP direct playback on their normal admission policy, and preserve explicit caller choices and existing fallback behavior. Applying this preference automatically would be a scoped routing change requiring release qualification.

The existing public option provides the route today:

```js
const player = new Player(container, { nativeRemux: 'always' });
await player.open(file);
```

That exact configuration, with automatic selection retained, also passed all seven positions on Firefox 157 and selected `native-remux`: [automatic-selection receipt](../results/firefox-native-root-cause-20261005/automatic-remux.json).

Final forced-native probes passed **42 immediate pause/seek/resume commands**: seven source positions (0.5, 5, 7.1, 8, 9, 10, 11 seconds), at 0.5×, 1×, and 2×, on both Firefox 146.0.1 and installed Firefox 157.0. Each checks continued clock/frame output after `play()` resolves and that the public source position was preserved. The original fixture is unchanged. [Firefox 146](../results/firefox-native-root-cause-20261005/final-remux146.json), [Firefox 157](../results/firefox-native-root-cause-20261005/final-remux157.json), and [validated summary](../results/firefox-native-root-cause-20261005/validated-solution-summary.json) retain the final cohort. Earlier repeated remux trials also passed. Raw HTML media time can include the remux timeline bias; public Player time is the source-time check.

Remux requires its existing preparation assets and adds preparation work, so this should be a targeted preference rather than disabling direct playback universally. These are functional diagnostic trials, not fresh performance, audible fidelity, or full release qualification.

Other tested choices are inferior for this fix:

- Waiting for a seek frame or specifying `video/mp4` on the File still stalls.
- A Web Audio graph avoids the failure in these probes but changes audio ownership, activation, device routing, and lifecycle responsibilities.
- The existing automatic recovery reaches native remux, but only after the initial approximately 10-second timeout in this already-verified session. It recovers too late to prevent this symptom.
- Extending the timeout merely accepts the 15-second pause. A fixed 250 ms settling delay masks the decoded-queue race and has no portable guarantee.
- A stream-copy container rewrite alone did not help. Editing duration declarations is only a causal test and would alter media semantics.

The actual upstream fix is to update the decoder's availability state when a finite resource completes. A [proposed Firefox patch](../results/firefox-native-root-cause-20261005/mozilla-proposed-completion-notification.patch) calls the existing `DownloadProgressed()` computation on successful completion so its cached-byte test can dispatch can-play-through. It is a reviewable proposal against Firefox 157 source, not a built or validated Firefox fix. Upstream validation should cover local files, Blob URLs, HTTP completion, shutdown races, and incomplete/failed streams.

## Scope and retained harness limits

No Demuxe production source, original fixture, candidate runtime, release archive, tag, or output deadline was changed. The investigation uses the retained candidate at `ccd6d5b19da57bb9e5c1d4b026c5f0b1bdeb3591`. The new diagnostics and proposal live under `results/firefox-native-root-cause-20261005/`.

Earlier diagnostic mistakes remain distinguishable from product failures: `mode: 'auto'` was rejected because automatic selection uses an omitted mode; 4× was rejected because Demuxe's public rate range is 0.5–2; and the first Firefox 146 BiDi attempt hung and was terminated without a qualification result. Final Firefox 146 evidence uses Playwright. An early duration-only control retained a duration gap and did not help; the final alternating control explicitly resets the fixture override and hashes the loaded bytes. All final solution claims refer to the completed final cohorts, not those exploratory attempts.

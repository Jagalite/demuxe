# Firefox native seek/resume investigation — 2026-10-05

> Historical investigation: observations and runtime identities refer to the recorded runs, not the current checkout. Diagnostic harnesses are optional and were not rerun for this archival commit. Some raw captures and external fixtures remain local; only selected supporting evidence is versioned.

Follow-up: [root cause and recommended solution](FIREFOX-NATIVE-ROOT-CAUSE-20261005.md) confirms the internal availability-state bug and duration/range condition. Native packet-copy remux is the preferred practical solution; the 250 ms settling delay below remains an exploratory workaround.

Firefox enters its own approximately 15-second buffering wait after an immediate paused seek/resume near the end of the unchanged `fixtures/example.mp4`. Demuxe rejects the resume when its 10-second output verification deadline expires. This explains the retained `NETWORK_TIMEOUT: Native output evidence timed out`; it is not a failed network download or an indefinitely stuck decoder in the longer observed control.

The same behavior reproduces without importing Demuxe, using a plain `<video>` and a Blob URL containing the complete file. It occurs in Playwright Firefox 146.0.1, including a visible window, and in the installed Firefox 157.0 with an isolated profile. A single pause → seek to 9 seconds → resume is sufficient; prior looping and the seeks to 1 and 5 seconds are not required. The earlier release evidence separately establishes that both the published reduced-v1.0.0 baseline and candidate have this limitation.

## Evidence and causal trace

The tested candidate is revision `ccd6d5b19da57bb9e5c1d4b026c5f0b1bdeb3591`. [Runtime identity](../results/firefox-native-resume-investigation-20261005/runtime-identity.json) verifies the four relevant generated modules against the retained package manifest. The unchanged source file SHA256 is `6c9cac6f4212f470d79a9f829f29ba459e6c3e401fab9feb6d757a10a507404c`; it contains 12 seconds of H.264 video and AAC audio. All playback surfaces are 640×360 CSS pixels.

Firefox emits `seeked`, `canplay`, `playing`, then `waiting`. During the wait, `currentTime` remains 9, `paused` is false, `seeking` is false, `readyState` is 2, and frames do not advance. The original Blob control reports buffered `[0, 12.001]` and duration/seekable end `12.034`, with no media error.

The [Firefox media log](../results/firefox-native-resume-investigation-20261005/firefox-clock.log.child-4.moz_log) records `Enter buffering due to buffering heruistics`, a transition from DECODING to BUFFERING, `StopPlayback()`, and a 15-second countdown. This is an internal buffering decision; decoded audio continues arriving while playback is stopped. In the [longer observation](../results/firefox-native-resume-investigation-20261005/probe-long-wait.json), plain video resumes after approximately 15.45 seconds, with no recovery action. The corresponding [single-seek log](../results/firefox-native-resume-investigation-20261005/firefox-long-wait.log.child-4.moz_log) records `Buffered for 15.109s`; the [three-seek log](../results/firefox-native-resume-investigation-20261005/firefox-long-wait.log.child-7.moz_log) records `Buffered for 15.084s`. Installed Firefox 157 also resumes after approximately 15.44 seconds under the longer diagnostic observation.

The [Firefox 146 source](https://hg.mozilla.org/releases/mozilla-release/raw-file/FIREFOX_146_0_RELEASE/dom/media/MediaDecoderStateMachine.cpp) supports this trace: `DecodingState::MaybeStartBuffering` combines low decoded data, low buffered data, and a false can-play-through flag. `BufferingState::Step` waits for sufficient buffered data, a can-play-through flag, or its 15-second deadline. `HasLowBufferedData` checks a buffered interval capped at the reported duration. A retained [source copy](../results/firefox-native-resume-investigation-20261005/Firefox-146-MediaDecoderStateMachine.cpp) provides exact version context. The 33 ms duration/buffer mismatch is a plausible contributor to the near-end buffering decision; the origin of that mismatch and its necessity have not been established.

Demuxe starts browser playback and output verification together in `Player.playNativeVerified`. Native verification requires advancing output, rather than accepting `play()` resolution or a seek frame alone. After 10 seconds without advancing output, it rejects the operation and rolls playback back to paused. That deadline remains unchanged in this investigation.

## Controlled results

| Control | Firefox 146.0.1 | Installed Firefox 157.0 |
| --- | --- | --- |
| Plain Blob, immediate resume, repeated cold trials | 3/3 stall | 3/3 stall |
| Demuxe Blob, immediate resume | Cold and warmed trials time out | 3/3 time out |
| Plain Blob, 250 ms between seek and resume | 3/3 cold pass; warmed pass | Not repeated in this cohort |
| Demuxe Blob, 250 ms between seek and resume | 3/3 cold pass; warmed pass | 3/3 cold pass |
| Plain HTTP source, immediate resume | 3/3 pass | Not tested |
| Plain muted Blob, immediate resume | 3/3 pass | Not tested |
| Plain Blob, longer observation without recovery | Resumes after ~15.45 s | Resumes after ~15.44 s |
| Stream-copy rewrite with video timescale 30000 | Not tested | Plain and Demuxe each fail 3/3 |

[Repeated Firefox 146 controls](../results/firefox-native-resume-investigation-20261005/probe-controls-repeat.json), [warmed delay controls](../results/firefox-native-resume-investigation-20261005/probe-warm-delay-repeat.json), [installed Firefox 157 results](../results/firefox-native-resume-investigation-20261005/system-firefox-final.json), [container rewrite results](../results/firefox-native-resume-investigation-20261005/system-firefox-copy.json), and [unchanged encoded packet proof](../results/firefox-native-resume-investigation-20261005/copy-fixture-identity.json) preserve the outcomes. The shared Chromium 152 preview passed the immediate plain-video sequence with approximately 80, 108, and 79 ms output acceptance after seeks to 1, 5, and 9 seconds; its [receipt](../results/firefox-native-resume-investigation-20261005/shared-preview-chromium.json) is a comparator, not Chrome release qualification.

Muting and unmuting after the stall, and seeking to the identical target after the stall, did not recover it within their observation windows. Muting before playback is a diagnostic control, not an acceptable audio-preserving workaround. The stream-copy rewrite changes no encoded packet payloads and did not solve the failure.

## Reproduction and release implications

The [standalone diagnostic page](../results/firefox-native-resume-investigation-20261005/repro.html), [page probe](../results/firefox-native-resume-investigation-20261005/probe-page.js), and [local server](../results/firefox-native-resume-investigation-20261005/server.mjs) provide immediate, delayed, and HTTP controls. Run `node results/firefox-native-resume-investigation-20261005/server.mjs`, then open `http://127.0.0.1:4198/` in Firefox. The server uses the retained candidate checkout and runtime paths; the [Playwright probe](../results/firefox-native-resume-investigation-20261005/probe.mjs) and [installed Firefox BiDi probe](../results/firefox-native-resume-investigation-20261005/system-firefox.mjs) are local investigation tools, not portable CI tests.

A bounded settling step after a paused native seek is a candidate workaround. The tested 250 ms delay allows the decoded queues to fill before resuming, but finite results do not establish a universal delay or production solution. A fix should preserve prompt cancellation and user activation, avoid silencing audio, retain the original output deadline, and qualify immediate seek/resume at multiple positions in Firefox and other supported browsers. Merely extending the timeout past 15 seconds would admit this long pause rather than prevent it.

No production source, original fixture, generated candidate runtime, release artifact, qualification acceptance rule, or release tag was changed. The longer waits are diagnostic observations and do not turn the failed original release case into a passing case. No Mozilla bug was filed. The precise decoder/refill scheduling that causes the initial low-data condition remains a narrower browser investigation question.

Two investigation harness issues are retained separately from playback failures: the first large repeated-case invocation exceeded the filesystem filename length limit before opening a browser, and the first installed-Firefox collector could not deserialize a deeply nested Demuxe result. The corrected collector serializes the result to JSON in the page; `system-firefox-final.json` contains the completed trials. Shared preview snapshots failed, while evaluation and the button interaction succeeded; no screenshot claim is made.

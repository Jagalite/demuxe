# Original-file and Firefox investigation

**Installed Firefox 156.0 passes the sampled original-file native-remux picture/playback checks. Default HEVC WebCodecs remains preference-gated.** No new production workaround or browser setting change was made.

## Findings

- The prior corruption was reproduced with Playwright's bundled Firefox 146.0.1 on an authored, explicitly BT.709-tagged Main10 fixture. Mean absolute RGB error was 174.1/255. Installed Firefox 156.0 scored 1.16 and Chrome 152.0.7977.83 scored 0.90 on the same control. This isolates the difference to these browser builds/profiles; the underlying Firefox decoder or compositor defect was not traced to an upstream patch.
- The original file's existing offline-prepared MP4 passes at 30 seconds in installed Firefox and Chrome.
- The **original MKV itself**, using Demuxe's current on-the-fly remux and bounded HTTP range reader, passes picture checks at 30, 120 and 950 seconds in both browsers. Firefox RGB errors are 1.81, 0.73 and 1.50/255; Chrome errors are 1.09, 0.54 and 1.05. Each check also delivered about 3 seconds of video progression and 71–73 new frames.
- From the late-file test, both browsers successfully seek back/forward to 30, 34, 900 and 2 seconds with newly delivered compositor frames. The raw HTMLVideoElement clock includes the remuxer's one-second bias; recorded `time` and `frame` values therefore include that second.
- With default settings, installed Firefox rejects the exact source configuration `hev1.2.4.L120.90` in `VideoDecoder.isConfigSupported`. In a separate temporary profile, enabling `dom.media.webcodecs.h265.enabled` changes that same check to supported. This establishes the preference gate; it does **not** qualify Hybrid decoded output or justify changing users' browser preferences.
- The application's original Software selection is therefore still understandable: default Firefox rejects Hybrid, while selected embedded subtitles exclude the existing normal Native routes. The prototype Native-remux-plus-mpv-subtitle route has not been promoted to production.

## Harness corrections and scope

The new harness connects to installed Firefox using its WebDriver BiDi endpoint, with a fresh temporary profile, avoiding the assumption that Playwright's bundled Firefox represents the installed release. It waits for a presented seek frame before copying pixels. The first attempt captured at time zero before useful presentation and used the wrong BiDi endpoint; that failed run is retained. An untagged synthetic control then exposed a reference color-matrix ambiguity. A separate packet-copied synthetic control with explicit HEVC/MP4 BT.709 metadata resolves that ambiguity; the untagged failed run is preserved.

Picture comparison uses the minimum RGB error among four nearby FFmpeg-decoded frames, with a pre-existing 5/255 gross-corruption threshold. This accommodates browser frame timestamp clipping and is **not** an exact frame-selection or color-fidelity proof. Late seek checks verify callback timestamps separately. Playback is muted: no acoustic output or audio fidelity qualification is claimed. There was no full 16-minute endurance run, and this does not establish all Firefox versions, hardware paths, HEVC sources, or Hybrid output.

Original-file images were compared in memory with `NO_IMAGES=1`; no new original-file screenshots were saved. Source media was not modified. The subtitle service's 16 MiB staging limit means the original MKV plus mpv subtitle prototype was not exercised end-to-end here. Native-video destination qualification and full subtitle-route qualification remain distinct.

The prior remux C source, Wasm, scheduler and generated NativePlayer hashes are unchanged since the remux fixes. The worker controller had changed outside this task; the current tested hash is recorded. Only this laboratory harness/documentation was changed during the investigation. No commit or push was performed.

## Evidence and reproduction

See `summary.json` for named raw runs and `manifest.json` for exact sources/assets. The earlier setup/reference failures remain in `../firefox-picture-2026-09-21T22-23-31.904Z/` and `../firefox-picture-2026-09-21T22-24-17.538Z/`.

```sh
REMUX=1 NO_IMAGES=1 BROWSERS=chrome,installed-firefox SEEK_TIME=950 MORE_SEEKS=30,34,900,2 SOURCE=/Volumes/seed2/Projects/startup-repro/software_test_slow.mkv node experiments/mpv-subtitle-service/firefox-picture-check.mjs
```

For the authored control, create `build/mpv-subtitle-service/fixtures/firefox-control-709.mp4` from `direct.mp4` using FFmpeg packet copy with `-bsf:v hevc_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -tag:v hvc1 -movflags +faststart`, then run the harness without environment overrides. `HEVC_PREF=1` is an installed-Firefox-only temporary-profile diagnostic, not a production recommendation.

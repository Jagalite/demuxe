<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Test media and screenshot attribution

The original-code grants and CC BY 4.0 report/result grant do not replace the licenses of third-party media
shown in test results.

## Big Buck Bunny

Movie-derived fixtures and screenshots showing Big Buck Bunny retain the film's
attribution: **(c) copyright 2008, Blender Foundation / www.bigbuckbunny.org**.

The film is licensed under [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).
See the [publisher's license and attribution instructions](https://peach.blender.org/about/).
The Sunflower version used in performance tests also credits Janus Bager
Kristensen (2013) in its embedded metadata. The recorded download is
[Blender's Sunflower movie archive](https://download.blender.org/demo/movies/BBB/bbb_sunflower_1080p_30fps_normal.mp4.zip).

Test adaptations include excerpts, remuxing, audio conversion, scaling and
screenshots with player UI or diagnostic overlays. These are playback tests,
not endorsements by the filmmakers. This notice covers movie imagery throughout
`results/`, including routing, pipeline, large-file and performance tests.
Keep this attribution with any separately redistributed movie-derived results.

The generator and source-hash recording are in
`experiments/playback-performance/movie-fixtures.py`; additional provenance is
recorded in `experiments/playback-performance/CHECKPOINT.md` and test manifests.
The film license does not grant rights to separately use publisher trademarks,
DVD artwork, or the separately distributed musical score.

## Synthetic fixtures and font

The base test media uses generated color patterns and test tones; the subtitle
fixtures are test text. `fixtures/example.mp4` is a synthetic test-pattern clip.
Fixture-generation scripts under `scripts/` and `experiments/` record the inputs
for the broader synthetic test matrix.

DejaVu Sans is a third-party font. Preserve `fixtures/FONT-LICENSE.txt` and the
source/hash record in `fixtures/assets.lock.json` when redistributing it.

The npm runtime package includes the font and its notice, but no test movie or
result screenshot. The source companion includes tracked fixtures and excludes
`results/`; the Git repository has a broader media surface than the npm runtime.

## Specialist codec test sources

The specialist screens use locally downloaded technical test streams from the
[FFmpeg FATE suite](https://fate-suite.ffmpeg.org/truehd/),
[FFmpeg sample collection](https://samples.ffmpeg.org/A-codecs/DTS/dts/),
[Dolby developer media](https://media.developer.dolby.com/Atmos/MP4/shattered-3Mb.mp4),
and [Dolby Laboratories' Dolby Vision contents repository](https://github.com/DolbyLaboratories/dolby-vision-contents).
The Dolby Vision imagery is **Sol Levante / Netflix** as identified by the source
repository and title card. The Dolby Atmos demonstration is **Shattered**.

Exact URLs, byte counts and SHA-256 identities are retained in
`tests/head-to-head/specialist-sources.json` and each run's `fixtures.json`.
No license grant is inferred from public sample hosting: these streams and
movie-derived screenshots are **NOASSERTION**, retain their original rights,
and are not covered by Demuxe's CC BY report-data grant. Downloaded and derived
media stay under ignored `build/`; they are not shipped with the runtime.
Adaptations include bounded excerpts, compressed-packet repetition for short
audio regressions, remuxing, generated companion audio/video and test captions.

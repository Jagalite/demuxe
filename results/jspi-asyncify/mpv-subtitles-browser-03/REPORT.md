# Actual mpv subtitle service — September 27, 2026

17/17 cases passed in Chrome 153.0.8010.53. `verified.json` records the independent
matrix/provenance verification of `result.json`.

| Component gate | pthread | JSPI | Asyncify |
| --- | --- | --- | --- |
| ASS + attached font, second cue, backward seek, recreate | pass | exact pixels | exact pixels |
| SRT + mov_text, second cue, backward seek, recreate | pass | exact pixels | exact pixels |
| PGS + VobSub expiry and recovery, recreate | pass | exact pixels | exact pixels |
| Observed pending source cancellation, close, reopen | reference pixels | pass | pass |

The pthread reference used COOP `same-origin` and COEP `require-corp` with shared
memory. JSPI and Asyncify used no COOP/COEP, no SharedArrayBuffer, and ArrayBuffer
Wasm memory. Asyncify removed both JSPI APIs before module initialization. These
are local component-origin checks, not a production deployment audit.

`m0.mkv` loaded its attached font with an initially empty `/fonts` directory.
All renders checked zero AO/VO chains. PGS and VobSub decoded a bitmap at 1 second,
recovered its packet at 0 for display at 33 seconds, cleared it at 35.6 seconds,
then replayed it after a backward seek. All nonempty pixel hashes and bounds match
the frozen pthread reference. Source replacement destroys and recreates the mpv
client within the same Wasm instance. Cancellation starts only after a real read
is pending, then checks load failure and successful reuse after close.

Every private case ended with zero live/retained tasks, wait keys, source handles,
pending reads and timers; all 24 task slots were free and no task was abandoned.
Five tasks were live at peak. The maximum observed Asyncify saved stack was
5,000 bytes. No CPU or startup benchmark was performed.

The module uses the raw scheduler as its only continuation owner. Emscripten glue
was built without JSPI/Asyncify flags, then the Asyncify Wasm was transformed by
Binaryen. Real mpv dispatch and thread-pool code were retained. A narrow transitive
header fix was required by the real mpv compile; failing and corrected build logs
are preserved in `../mpv-builds-01/`.

The candidate build is `mpv-subtitles-01` using verified private archives from
`mpv-deps-02`, Emscripten 4.0.14, pinned mpv and FFmpeg sources and maintained local
patches. `provenance/` contains the build record, frozen pthread manifest and
fixture provenance. The exact served JS is in `sources/`; the engine and fixture
hashes are in `result.json`. `ranges.json` records finite HTTP reads.

This establishes actual subtitle-component correctness for these fixtures. It
does not qualify mpv audio, Player routing, fallback, other browsers, device
behavior, long-media endurance, performance or release packaging. Earlier
11-case and 17-case runs remain historical; this third run adds full harness and
build-record binding. The favicon 404 printed during the run is unrelated to the
service assets.

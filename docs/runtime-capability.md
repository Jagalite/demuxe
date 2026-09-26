<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Runtime capability discovery

Public modes and controls are unchanged. The finite plan registry is still the
routing authority. There is no browser codec-support table and no numeric score.

1. Inspect source tracks and requirements. Static parsing, timestamp, codec-config
   and muxing contracts describe what Demuxe can construct.
2. Reject semantic/policy impossibilities: required subtitle/filter/output features,
   selected-track identity, lossy permission, transport, isolation and existing
   experimental qualification boundaries.
3. Cross-reference inspected selected audio/video configurations with the browser.
   Native direct queries `canPlayType()` for the source container, each selected
   codec, and their combination. Native remux queries `MediaSource.isTypeSupported()`
   for its output packaging; audio adaptation queries the adapted output codec.
   Negative answers exclude the corresponding plan before a playback backend opens.
   Hybrid uses its complete `VideoDecoder.isConfigSupported()` preflight when the
   inspected initialization configuration is available.
4. Attempt admitted plans in registry order: unchanged Native, packet-copy Native,
   explicitly permitted/qualified adaptation, Hybrid, Software. Applicable gain/ASS
   combinations retain the same order. Candidates are never probed concurrently.
5. Accept the candidate that establishes startup readiness for the full request.
   A failed candidate is destroyed and its element removed before the next plan.

`nativeRejection()` checks track semantics; `nativeBrowserCapabilities()` applies
browser answers separately to each Native plan. The mappings describe MIME syntax,
not a browser or codec allowlist. Exact AVC/HEVC profiles come from inspected
initialization data. A selected AC3 track is queried even if video configuration is
incomplete. Disabled and unselected audio tracks do not veto the selected route.
The cheap MP4 parser reports container/configuration metadata to the same checks.
Local EBML headers distinguish WebM from FFmpeg's shared Matroska/WebM family.
Unknown configurations, incomplete metadata, `maybe`, missing APIs, or query exceptions
are recorded as unknown, never as positive support or an automatic Native veto.
Preflight serializes inspected metadata into query syntax, including source-derived
AAC object types, standard audio tokens and integer PCM token `1` for original
WAV/Matroska. These tokens do not declare browser support. DTS stays unknown
unless inspection supplies its actual profile; no profile enumeration is guessed. Missing selected-audio
configuration leaves direct Native eligible for bounded runtime audio/video
verification and existing compatibility fallback. Container MIME and output
packaging descriptions remain construction details, not browser support tables.
Raw FLAC and ADTS use bare MIME types rather than MP4 codec parameters. All checks
use the current selected audio, including reselection after a track change.
Inconclusive answers still require preparation and runtime checks. Missing remux/Hybrid construction contracts exclude
only those plans. No support query proves playback of malformed source packets.
The current packet-copy muxer cannot initialize AC3 before reading its packets;
that construction limit excludes AC3 remux even on browsers that advertise AC3.
Direct MP4/AC3 remains eligible wherever the browser reports support.

## Evidence and paused startup

`diagnostics.planAdmission` describes semantic and browser eligibility. Its
`browserCapability` records selected tracks, the query API, MIME strings, raw browser
answers, and `supported | unsupported | unknown`. This records preflight separately
from actual playback, and applies on initial selection and later reselection.
For an eligible Native candidate, `browserCapability.decodingInfo` records bounded
`navigator.mediaCapabilities.decodingInfo()` queries with the correct `file` or
`media-source` type. Queries use selected-track MIME/configuration and available
sample rate/channel metadata. Video predictions require declared width, height,
bitrate and frame rate; absent fields are explicitly unqueried, never invented.
The cheap MP4 inspector extracts declared maximum bitrate and the maximum rate
from its sample-time table without additional media reads. Other inspectors that
lack those fields retain their existing MIME and WebCodecs checks.

Exact asynchronous query inputs are cached per player (128 entries); independent
track queries run together under a 150 ms deadline. Missing APIs, exceptions and
timeouts remain explicit diagnostic outcomes at the startup deadline. A successful
late answer replaces the cached timeout, carries `late: true`, updates current
diagnostics and schedules existing automatic promotion reconsideration. Playing
sessions retain the existing background-promotion opt-in; manual modes are not
rerouted. A late hint never overrides a cached actual playback failure. Evicted
requests cannot overwrite a newer request, and destroyed players ignore callbacks.
Re-selection uses the new selected
track/configuration, not a source-wide codec verdict. `supported`, `smooth` and
`powerEfficient` from this supplemental API are advisory: file/MSE predictions
can differ from the media-element implementation. They do not override direct
`canPlayType`/MSE admission, change route order, claim measured CPU savings, or
relax output verification. WebRTC capability lists are not used for file routing.
See the [Media Capabilities specification](https://www.w3.org/TR/media-capabilities/).

The additive
`diagnostics.runtimeCapabilities` records `planId`, an opaque player-local
`sourceIdentity`, eligibility, `untested | probing | verified | failed`, reason,
failure category and observable evidence. Ineligible is distinct from runtime
failure; eligible but unattempted is not "unsupported".

Native startup waits for decoded current data: HAVE_FUTURE_DATA, no active seek,
video dimensions and a decoded-frame counter for an expected video track. Where
Chrome exposes decoded audio byte counters, a candidate with current data ready
but zero decoded audio bytes remains pending until bounded output verification.
A bounded readiness timeout is not automatically a codec failure. A ready video
with an expected but missing decoded audio track is a compatibility failure.
Metadata alone, canplay, a resolved play promise and MIME hints are insufficient.

The paused-open contract is retained: startup does not autoplay or unmute the media.
A compositor callback is recorded as `videoPresented` only when observed; decoded
readiness does not claim first-photon timing. Audio bytes are decode progress, not
physical speaker output or bit-exact device fidelity. Browsers without audio counters
expose less evidence; absent fields are not manufactured sample proof.

`npm run test:browser-capabilities` evaluates Chrome, Firefox, and WebKit with
MP4, Matroska, WebM, selected/disabled audio, AC3, DTS, raw FLAC/ADTS/WAV, and
H.264 High 10, plus AC3-to-AAC track switching. It asserts
that rejected Native plans never open and checks decoded PCM during first play
and resume where the browser exposes it. WebKit Native MSE/WebM PCM capture is
unavailable in this harness; those cases explicitly report audio output unverified
instead of substituting clock progress for audio proof. Direct MP4 and Hybrid PCM
remain tested there. `REPRO_FILE=/absolute/path/file.mkv` adds the AC3 reproduction.
The same matrix is part of `npm run test:automatic-selection`.

MSE uses real source-derived MIME/configuration. Its support API is eligibility
information. Diagnostics separately retain SourceBuffer creation, initialization
update completion, media update completion, and Native decoder readiness.
Hybrid retains the actual complete WebCodecs configuration check, decoded-frame and
presentation gates. Software uses the actual compiled mpv/FFmpeg runtime. Paused
software audio-only startup requires that runtime's `audio-codec-name` decoder
configuration; it reports `audioDecoderConfigured` separately from decoded PCM and
consumed samples. The audio-only regression additionally plays and checks real PCM
consumption. Drawing an empty canvas does not count as video presentation.

## Ownership, failures and cache

The previous accepted session remains authoritative while a candidate is prepared.
Candidate events cannot mutate it. Retirement occurs before cleanup; late events
cannot recover or publish a retired session. Backend open/initialization awaits are
interruptible, including stalled module imports. Candidate destruction cancels
readiness polling, media/frame listeners, reads, workers and object URLs.

Only positive compatibility failures continue to another plan. Authorization,
identity/integrity, transport, cancellation, autoplay policy, missing assets and
unknown failures remain terminal. Direct remote MediaError 3/4 can hide an HTTP
failure: bounded RangeReader revalidation checks transport and the inspected
representation before permitting compatibility fallback. Controlled transport
requirements still exclude direct playback entirely.

The cache is player/session scoped: up to 32 successful source/plan evidence entries,
opaque WeakMap source identities, cleared on close/destroy and invalidated on failure.
`previouslyVerified` is confidence only. Every new candidate validates startup again,
even for a previously successful source. No localStorage, browser fingerprint or
cross-source acceptance shortcut is used.

Optional FLAC inspection is deferred until original-copy plans have failed or are
ineligible. Successful PCM24 Native direct does not import adaptation, Hybrid or
Software assets. Existing experimental opt-ins, source bounds and unequal-tail
platform qualification remain in force; this change does not qualify new transforms.

## Regression commands

Use installed dependencies and matching runtime asset pairs (see runtime-assets.md).
No engine rebuild is required when those pairs are available.

```sh
npm ci --ignore-scripts
npm run build
node --test tests/runtime-capability-contracts.mjs tests/native-selection.mjs \
  tests/plan-admission.mjs tests/fast-source-inspector.mjs \
  tests/optimization-contracts.mjs tests/remux-packaging-contracts.mjs

# Existing small fixture generator supplies the audio-only control.
python3 experiments/software-full/fixtures.py

# Optional reproducible PCM24 case when the original head-to-head fixture is absent.
# This is a regression fixture, not the identical head-to-head input.
mkdir -p build/fixtures/runtime-capability
ffmpeg -nostdin -v error -i fixtures/example.mp4 \
  -map 0:v:0 -map 0:a:0 -c:v copy -c:a pcm_s24le -ar 48000 -ac 2 \
  build/fixtures/runtime-capability/pcm24.mkv
node tests/runtime-capability.mjs

# To test the exact original head-to-head input instead:
DEMUXE_PCM24_FIXTURE=/absolute/path/to/F3.mkv node tests/runtime-capability.mjs

# Existing lifecycle and automatic routing checks; Chrome-only is explicit.
node tests/public-api.mjs
BROWSER=chrome node tests/automatic-selection.mjs
```

Existing suites require their documented fixtures. The new browser suite writes
request traces, diagnostics, a PCM24 capture, and pass/failure records to a timestamped
`results/runtime-capability/browser-*` directory. Its failure injection cases are
labeled; actual Native, MSE, Hybrid and Software output checks are separate from
policy assertions. Chrome-only automatic-selection runs record the Firefox case as
skipped, never passed. This is functional regression evidence, not a performance
benchmark or cross-browser qualification.

### Conservative query and audio evidence corrections

Native Direct checks both `video/matroska` and `video/x-matroska`. A positive
complete alias can admit a runtime trial; incomplete serialization, `maybe`, and
query exceptions remain unknown. Negative partial queries cannot veto the route.
Per-track `serializationComplete` distinguishes a usable token from an accurate
configuration. PCM family tokens do not express sample precision, channels and
sample rate, so PCM24 remains unknown even when token `1` receives an answer.
Direct evidence remains separate from MSE and WebCodecs component evidence.

A zero decoded-audio counter does not reject paused preparation. Output verification
runs concurrently with play, so a pending play promise cannot bypass its 10-second
deadline. Missing decoded audio at that deadline is a compatibility failure when
current-data readiness and a zero counter provide affirmative evidence; absent
audio observability remains an inconclusive timeout, not a cached codec failure.
Automatic local-file playback may then try the next admitted route; remote timeouts
remain terminal. An unverified trial preserves its starting position on fallback.
Clock advancement alone never verifies audio. Diagnostics retain initial/current
byte counters, their delta, browser audio presence and clock advancement. Already
buffered decoded bytes can establish initial decode evidence without requiring a
short file to decode again. Browser audio presence plus clock remains weaker evidence
than decoded counters and does not prove physical speaker output.

Paused opens are prepared, not output-verified; actual playback remains gated by
verification on the first permitted play request. No silent autoplay probe is added.

### Verification lifecycle and no-counter browsers

When decoded-byte counters and `mozHasAudio` are absent, an enabled entry in the
browser's `audioTracks` list plus progressing playback supplies explicit track-presence
evidence. An absent or disabled track does not qualify. This is labelled
`enabled-browser-audio-track-and-clock`, with `audioObservation.enabledTrack` exposed;
it is weaker than decoded-byte/sample evidence and does not prove speaker output.
This preserves working Native playback on browsers exposing track presence instead
of proprietary decode counters, without accepting a media clock alone.

Concurrent play/output verification uses an attempt-owned abort signal. A rejected
play request cancels and settles its verifier before another operation can proceed,
including selective PCM verification. Late MediaCapabilities results are reconciled
before publishing a multi-track snapshot, so one track's late success cannot be
lost while a sibling query is still pending. The 150 ms waiting deadline is unchanged.

### Shared evidence and feature-selected adapters

Query diagnostics distinguish source serialization completeness from the adapter's
`negativeDecisive` judgment. Original Matroska codec-parameter negatives remain
unknown for both MIME aliases because that syntax is not qualified as a portable
original-file rejection. Positive answers remain hints requiring runtime verification.
MSE answers describe prepared packaging only. No user-agent codec support table is used.

Runtime audio adapters select observed APIs in order: decoded-byte counter, browser
presence flag, enabled browser audio track. `audioEvidenceStrength` is `decoded`,
`presence`, `consumed` (selective PCM), or `unknown`; `audioDecoded` is not asserted
for presence. The existing `outputVerified` flag describes the route's runtime
acceptance gate, not a stronger proof than its component evidence. Paused opens
remain prepared. Independent browser tests capture PCM where available.

Shipped Safari requires separate WebDriver qualification; Playwright WebKit is not
Safari. Safari 26.5.2 on this host refused a session because Allow remote automation
is disabled. Browser settings were not changed to bypass that restriction.

Installed Safari follow-up: after the user enabled remote automation, Safari 26.5.2
passed four bounded route/lifecycle cases. See
[Safari evidence](../results/browser-media-capability/SAFARI.md). AAC/MKV audio remains
independently unobservable through the MSE capture path; it is not sample-qualified.

Subtitle output verification propagates attempt cancellation through both sampled
renders and the final timeline-restoration RPC. Cancelled requests retire their
pending entries and deadlines; late bitmap replies are discarded by the existing
worker dispatcher. The ordinary subtitle scheduler restores the current timeline
after cancellation without delaying the rejected play request.

Supplemental MSE decoding queries exclude statically rejected container alternatives.
Each remaining query carries its `container` label; multiple alternatives are not
presented as one chosen output format. Adapted audio is recorded as unqueried until
actual output metadata is available, rather than reusing source bitrate/rate/layout.

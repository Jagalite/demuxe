# Runtime capability discovery

Public modes and controls are unchanged. The finite plan registry is still the
routing authority. There is no browser codec-support table and no numeric score.

1. Inspect source tracks and requirements. Static parsing, timestamp, codec-config
   and muxing contracts describe what Demuxe can construct.
2. Reject semantic/policy impossibilities: required subtitle/filter/output features,
   selected-track identity, lossy permission, transport, isolation and existing
   experimental qualification boundaries.
3. Attempt admitted plans in registry order: unchanged Native, packet-copy Native,
   explicitly permitted/qualified adaptation, Hybrid, Software. Applicable gain/ASS
   combinations retain the same order. Candidates are never probed concurrently.
4. Accept the candidate that establishes startup readiness for the full request.
   A failed candidate is destroyed and its element removed before the next plan.

`nativeRejection()` checks track semantics only. Unknown PCM24, other codec names,
unknown AAC profiles and negative `canPlayType()` hints do not reject Native direct.
The cheap MP4 parser likewise does not ask the browser to approve parsed metadata.
Missing remux/Hybrid construction contracts exclude only those plans; they do not
assert that the browser cannot play unchanged bytes.

## Evidence and paused startup

`diagnostics.planAdmission` describes semantic eligibility. The additive
`diagnostics.runtimeCapabilities` records `planId`, an opaque player-local
`sourceIdentity`, eligibility, `untested | probing | verified | failed`, reason,
failure category and observable evidence. Ineligible is distinct from runtime
failure; eligible but unattempted is not "unsupported".

Native startup waits for decoded current data: HAVE_FUTURE_DATA, no active seek,
video dimensions and a decoded-frame counter for an expected video track. Where
Chrome exposes decoded audio byte counters, expected audio must also produce bytes.
A bounded readiness timeout is not automatically a codec failure. A ready video
with an expected but missing decoded audio track is a compatibility failure.
Metadata alone, canplay, a resolved play promise and MIME hints are insufficient.

The paused-open contract is retained: startup does not autoplay or unmute the media.
A compositor callback is recorded as `videoPresented` only when observed; decoded
readiness does not claim first-photon timing. Audio bytes are decode progress, not
physical speaker output or bit-exact device fidelity. Browsers without audio counters
expose less evidence; absent fields are not manufactured sample proof.

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
  tests/plan-admission.mjs tests/cheap-mp4-probe.mjs \
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

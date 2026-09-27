<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# API implementation and integration ledger

Baseline: `f68c1b1bc0e2ee0f3a6b41e890add5c54e30280d`, 0.3.0-beta.4.
Baseline working tree had an unrelated README edit and research outputs; preserved.
The original roadmap is historical planning, not a list of currently missing APIs.
New integration results are kept separately in `results/api-integration/`.

## Retained roadmap inventory (Q0)

| Family | Actual symbols | Existing evidence and limits |
| --- | --- | --- |
| Metadata/chapters | `state.mediaInfo`, `inspectMedia`, `seekChapter` | `results/api-roadmap/review-20260927/README.md`; metadata completeness and route limits remain explicit |
| Subtitles/attachments | `attachSubtitle`, `attachFont`, `attachTextTrack`, `removeAttachment`, timing/style methods | Same review report; renderer stays core-owned; no universal cues |
| Quality/live | `setQuality`, `getStreamingState`, `seekToLive` | Same report, real Shaka checks; no adapter ABR or inferred quality |
| Playback controls | `open` startTime, `seek`, `setLoop`, `setPlaybackRange`, `stepFrame`, `snapshot` | Same report; exact frame timestamps remain unknown where documented |
| Sources | Blob input, `inspectMedia`, bounded CustomSource | Same report; custom playback staging remains limited to 32 MiB |
| Previews | `Player.preview`, standalone `PreviewController` | `results/api-preview-facade/20260927/README.md`; shared latest-wins lane; known Firefox variability retained |
| Diagnostics/events | `subscribe`, typed events, `getStats`, `getPlaybackExplanation` | Same reports; source scope and redaction preserved |
| Presentation | `Player.presentation` | Same review report; browser gesture, composition and route restrictions retained |

These are baseline results, not reruns of every original scenario. Earlier component
48/50 and Firefox software-preview limitations are not reclassified as passes.
Current checks and gaps are recorded in [the integration run report](../results/api-integration/20260927/README.md).

## Change register

| Item | Disposition | Public contract / implementation |
| --- | --- | --- |
| INT-01 | Implemented | This ledger, pinned original revision and separate integration evidence |
| INT-02 | Implemented | `demuxe/contracts`, selector helper, canonical snapshots/capabilities reused |
| INT-03 | Implemented | Stable `Player.host`, explicit complete-container fullscreen target |
| INT-04 | Implemented | Explicit owned creation/borrowed binding; synchronous callback cutoff and joined cleanup; application-owned sources |
| INT-05 | Implemented with bounded existing utilities | Built-in controls typed against public `PlayerAPI`; fullscreen uses presentation controller; diagnostic compatibility forwarding and UI policy normalizers retained |
| INT-06 | Implemented, narrow profile | Controls-free `demuxe-media`, explicit registration, asynchronous setter error channel |
| INT-07 | Implemented profiles, scoped qualification | Media Chrome 4.19.2 and Video.js 8.24.1 Tech; exact tested environments in run report |
| INT-08 | Deferred as specified | No concrete consumer requires timed cues, another preview lane, or display metadata in the core |
| INT-09 | Implemented | Separate adapter imports, exact dev dependencies, SSR import tests, bounded counters/errors |
| INT-10 | Deferred as specified | No general native parity, arbitrary legacy plugin support, casting/DRM or wider source ownership |

## Conformance index

| IDs | Evidence / qualification boundary |
| --- | --- |
| IC-01, IC-16 | `tests/integration-types.ts`, Node import test; existing roadmap declarations/contracts retained |
| IC-03 | Structural UI type extraction and source audit: ordinary controls use public methods; no backend/surface access |
| IC-04 | Node selector tests: initial delivery, equality, failure isolation, idempotence |
| IC-05, IC-06 | Node immediate delegation/intent/event tests; real external controls browser checks |
| IC-07, IC-10, IC-13 | Browser failed replacement, all three mode changes with stable host, borrowed disposal and continued playback |
| IC-08 | Late rejected commands after disposal tested; canonical operation queue/cancellation retained |
| IC-09 | Unknown duration/ranges Node test; buffer/readiness-dependent controls excluded |
| IC-11, IC-12, IC-22 | Focused host fullscreen/layout tests; broad accessibility audit and cross-document moves not run |
| IC-14, IC-15 | Owned cleanup/terminal remount Node test; borrowed lifetime tests; full worker-tree stress campaign not run |
| IC-17–IC-19 | Rich canonical APIs reused, no adapter captions/quality/live/preview controls advertised; prior baseline evidence remains separate |
| IC-20 | Source reflection rejection/opaque Video.js identity, rollback browser tests; no adapter source opening code |
| IC-21 | Integration-local counters and redacted operation errors; canonical statistics unchanged |
| IC-23 | Real host packages with application-owned fixture and actual mode transitions; exact results in run report |
| IC-24 | Matched paused Native binding observations; no CPU/energy/heap or universal zero-overhead claim |

I4 extensions remain demand-driven. Adapter success does not qualify more codecs,
Safari, all plugins, JSPI/Asyncify deployment variants, or new performance claims.

Follow-up review: [lifecycle, ownership and event corrections](../results/api-integration/review-20260927/README.md). Earlier hashes and reports remain historical; the review record pins subsequent changes.

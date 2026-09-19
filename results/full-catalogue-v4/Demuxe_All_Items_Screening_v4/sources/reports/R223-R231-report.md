# Demuxe media/browser frontier — R223–R231 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96 built on Debian GNU/Linux 13 (trixie); ffmpeg version 7.1.5-0+deb13u1 Copyright (c) 2000-2026 the FFmpeg developers; Python 3.13.5; Node v22.16.0.  
**Scope:** codec-frame restart boundaries, coded-payload-preserving remux/filter routes, exact seek pre-roll, and compact packet metadata. No Demuxe production source changes.

> **Definition note.** The earlier chat history did not contain recoverable persisted cards for R223–R231. To avoid silently pretending otherwise, this run defines a continuity batch immediately after R214–R222 and records the exact definitions below. These IDs should now be treated as the canonical R223–R231 definitions unless an older missing card set is later recovered.

## Result summary

| ID | Verdict | Decisive result |
|---|---|---|
| R223 | **PROMISING STRONG** | FLAC suffix beginning at frame 42 decodes PCM-bit-exact while retaining only 51.4% of source bytes. |
| R224 | **PROMISING BOUNDED PREROLL** | Original Opus packets reach bit-exact decoder state after 30 prior 20-ms packets (600 ms) in this fixture; 80 ms is materially closer but not bit-exact. |
| R225 | **PROMISING STRONG** | Raw H.264 cut at IDR packet 60 (with repeated SPS/PPS) decodes byte-for-byte to the original 120-frame suffix. |
| R226 | **PROMISING MODEL** | Exact 600-packet timing/offset/keyframe index encoded in 5913 bytes vs 28800 bytes for six naive 64-bit fields — 79.5% smaller. |
| R227 | **PROMISING STRONG** | All 150 AVC packet payload SHA-256 hashes remain identical across MP4→Matroska stream-copy remux. |
| R228 | **NEGATIVE — NAIVE SPLICE** | Byte-concatenating two independently encoded AAC-LC ADTS streams preserves bytes/length but is not sample-exact across the second segment; max float error 0.0901. |
| R229 | **PROMISING STRONG** | Removing one MPEG-TS audio track preserves every selected H.264/AAC packet payload hash while reducing transport bytes 18.7%. |
| R230 | **PROMISING STRONG** | MP3 becomes sample-exact at the chosen seek target with 2 prior frames / 48 ms; 0 or 1 prior frame is insufficient. |
| R231 | **PROMISING STRONG — NARROW PROFILE** | AAC-LC with PNS/TNS disabled becomes sample-exact with one prior ADTS frame (21.33 ms); default AAC in this fixture never became bit-exact even with 100 prior frames. |

QA: **51/51 bounded checks passed.**

## Canonical continuity cards used for this run

| ID | Mechanism | First decisive test |
|---|---|---|
| R223 | **FLAC frame-range microstream.** Reuse the original FLAC metadata header plus only complete FLAC frames at/after a requested frame boundary. | Start halfway through a continuous stereo FLAC; compare decoded PCM byte-for-byte to the original suffix. |
| R224 | **Opus exact-state pre-roll.** Start a fresh decoder on original coded Opus packets before a target and determine the bounded packet window needed to reproduce continuous decoder state. | Decode a deterministic nonperiodic stereo source continuously vs restarted at 0–40 packets of pre-roll. |
| R225 | **Self-contained H.264 IDR suffix.** For Annex-B AVC with repeated parameter sets, expose only bytes from a qualified IDR onward. | Compare every decoded YUV byte against the corresponding original suffix. |
| R226 | **Compact exact packet index.** Delta/varint encode packet byte positions, sizes, DTS deltas, CTS offsets, durations, and keyframe flags. | Round-trip a real B-frame AVC/MP4 packet index exactly and compare storage to fixed 64-bit tuples. |
| R227 | **Container-agnostic sample cache identity.** Address immutable coded samples by packet payload rather than container byte layout where codec configuration semantics agree. | Stream-copy AVC MP4→Matroska and compare every packet payload hash/size. |
| R228 | **Raw AAC segment splice.** Test whether separately encoded compatible AAC-LC ADTS segments can simply be concatenated without resetting/repairing decoder state. | Compare concatenated decode to concatenation of the independently decoded source segments. |
| R229 | **Payload-preserving TS track elimination.** Rebuild MPEG-TS tables/packetization while copying only selected elementary streams. | Drop the second AAC track and verify every retained video/audio demux packet payload hash. |
| R230 | **Exact MP3 seek closure.** Treat MP3 seekability as a bounded recovery dependency rather than arbitrary frame independence. | Cut at a middle MP3 frame with 0..N preceding frames and find the first pre-roll that reproduces continuous PCM exactly. |
| R231 | **AAC tool-aware exact seek closure.** Qualify exact midstream restart only for AAC profiles/tool combinations whose decoder state can be restored with a bounded prior-frame window. | Compare default AAC-LC against PNS/TNS-disabled AAC-LC with 0..100 prior ADTS frames. |

## R223 — FLAC frame-range microstream

The 8-second stereo FLAC contains 84 demuxed FLAC frames. The selected restart begins at frame 42 / sample 193536. The microstream was built by keeping the original 8286 metadata/header bytes and appending only complete coded frames from that point onward.

It decodes to **exactly the same 1,523,712 PCM bytes** as the corresponding original suffix (SHA-256 `0515cc1f8b3d5f2e12ee7b8a65f3ec94414dfa7f32ec51885ef72bcde1d20ff5`). Source size is 236,881 bytes; microstream is 121,751 bytes (51.4%).

This is a strong byte-range/restart primitive for whole FLAC-frame boundaries. Production use still needs truthful duration/STREAMINFO handling instead of relying on stale original totals in a synthetic microfile.

## R224 — Opus exact-state pre-roll

The fixture has 501 original 20-ms Opus audio packets. A fresh libopus decoder was started at increasing packet distances before target packet 250; no packet was re-encoded.

Zero pre-roll differs substantially (first-target-packet maximum float difference 0.333295). At 80 ms, the first-target-packet maximum difference falls to 0.042560, but it is still not bit-exact. In this fixture the first tested window that reproduces the entire remaining decoder output exactly is **30 packets / 600 ms**.

This does **not** establish a universal 600-ms Opus requirement. It establishes that “seek with original packets” and “bit-exact decoder state” are separate properties, and a Demuxe exactness mode must measure/qualify state closure rather than treating a normal perceptual seek pre-roll as proof of bit identity.

## R225 — H.264 self-contained IDR suffix

The raw 6-second 30-fps AVC stream has 180 packets and IDRs at packet indexes 0, 30, 60, 90, 120, 150. x264 repeated SPS/PPS at IDRs. Starting the byte stream directly at packet 60 produces 120 decoded frames whose YUV420 bytes are **exactly equal** to frames 60–179 of the continuous decode.

The retained coded suffix is 143,452/208,538 bytes (68.8%). This supports a qualified minimal-byte seek route for Annex-B AVC when the chosen random-access point carries everything the decoder needs.

## R226 — compact exact packet index

A 20-second 29.97-fps H.264/MP4 with B-frames yields 600 packets. The prototype stores packet byte gaps, sizes, DTS deltas, signed PTS−DTS offsets, durations, and a key flag using unsigned/zig-zag varints. Decoding that sidecar reconstructs **every original scalar exactly**, including the six observed CTS offsets [0, 1001, 2002, 3003, 4004, 5005] and duration 1001.

The compact form is 5,913 bytes versus 28,800 bytes for six padded 64-bit fields per packet — **79.5% smaller**. This is a representation result, not yet a browser seek benchmark or a comparison to MP4's own optimized sample tables.

## R227 — coded-sample identity across containers

A 150-packet AVC stream was encoded once in MP4 and stream-copied to Matroska. Every packet has the **same payload size and SHA-256** in both containers. The first packet hash is `SHA256:de4472b3c0e949b4f79e3a6a66dfbd8e925e97ea2d63e033a1287505875f6201`.

That supports making a prepared/cache object container-independent at the coded-sample layer when decoder configuration, dependency boundaries, color/output semantics and authorization also match. It does not imply the surrounding MP4/MKV bytes, timestamps, cue structures, or decoder configuration records are interchangeable.

## R228 — naive AAC splice is rejected

Two separately encoded 3-second stereo AAC-LC ADTS streams were concatenated byte-for-byte. File length is exactly the sum of the inputs, and the concatenated decoder produces the expected total number of samples, but the second segment is **not** equal to decoding B as its own stream. Maximum float difference is 0.090085; 144,640 sample frames differ above 1e-7.

This rejects the naive “compatible headers means raw AAC segments are spliceable” route. Transform overlap and other decoder state must be accounted for, or the player must create an explicit discontinuity/reset instead of pretending the coded streams are continuous.

## R229 — MPEG-TS track elimination with payload preservation

The source transport contains one H.264 stream and two AAC tracks. Rebuilding the TS with only video + first audio preserves **all 150 video packet payload hashes** and **all 236 selected-audio payload hashes**. The unused 236 AAC packets are absent.

Transport size falls from 345,920 to 281,248 bytes, a 18.7% reduction. This validates a payload-preserving track-pruning route; the TS container itself must still be rebuilt because PAT/PMT/PID/PCR/continuity semantics belong to the output transport.

## R230 — exact MP3 seek closure

At target packet 220, beginning with no earlier MP3 frames or only one earlier frame does not reproduce the continuous decoder PCM. With **two prior MP3 frames / 48 ms**, every remaining decoded float sample is identical to the continuous decode.

The decisive errors are:

| Prior frames | Max abs error | Exact suffix |
|---:|---:|:---:|
| 0 | 0.345402271 | no |
| 1 | 0.330341399 | no |
| 2 | 0.000000000 | yes |
| 3 | 0.000000000 | yes |
| 4 | 0.000000000 | yes |

This is fixture/profile evidence, not a universal two-frame MP3 theorem. It shows the useful design: seek admission should be expressed as a coded dependency/recovery window and measured against an exact oracle.

## R231 — AAC exact seek needs a tool-aware profile

With the default FFmpeg AAC-LC encode, a decoder started midstream does not reproduce the continuous output bit-exactly even when fed **100 earlier ADTS frames** in this fixture. The mismatches are consistent with stateful coding-tool behavior; bounded frame count alone is therefore not enough to claim exactness for arbitrary AAC-LC.

The controlled profile disables PNS and TNS. Under that restriction, zero pre-roll differs only at restart, while **one prior ADTS frame / 21.33 ms** restores exact equality for the complete suffix. This is the correct kind of admission rule for Demuxe: qualify by concrete codec-tool state, not only codec name/profile label.

## What this batch adds

The strongest immediately actionable mechanisms are **R223** (FLAC frame-range microstreams), **R225** (IDR-qualified AVC byte closure), **R229** (TS track pruning with payload identity), and the exact-seek dependency measurements **R230/R231**. **R227** strengthens container-independent sample caching. **R226** is a compact sidecar/index representation candidate. **R224** shows that Opus perceptual seek pre-roll and bit-exact state recovery are different targets. **R228** is a valuable rejection: independent AAC segments cannot be blindly concatenated as one continuous coded stream.

## Evidence boundary

These are host codec/container experiments. They do not claim browser MSE/WebCodecs behavior, Wasm performance, hardware-decoder state, or production Demuxe integration. Exactness claims are limited to the stated fixtures, codecs, tool settings and decoder builds. Negative/qualified results are preserved rather than converted into replacement mechanisms.
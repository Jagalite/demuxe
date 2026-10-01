# Standalone TAK conversion

`repairTakAudio` and `repairTakAudioFragments` convert the maintained TAK reader
profile to FLAC in fragmented MP4. The supported profile is the original
126.746-second official sample: TAK codec2/profile2, 44.1 kHz, mono, integer16.
Other configurations are rejected before decoder or encoder factories run.
Opus output and implicit resampling are not admitted.

The reader validates metadata and every indexed frame's header/body CRC before
conversion allocates codec owners. Each packet's original sample start and
sample duration must agree with native decoded PCM. Total decoded and encoded
samples must equal the reader's declared5589504 samples. Integer PCM never
passes through floating-point quantization; output FLAC24 preserves every
original16-bit sample exactly.

The fragment iterator owns decoder and encoder lifetimes. Completion, early
iterator return, failure and abort dispose both owners. The convenience method
retains the shared archive input/output byte limits. Canonical indexing scans
compressed frame bytes with a fixed64 KiB cache; it does not claim sparse
opening or zero-copy decoding.

`tests/provider-tak-repair.mjs` checks full PCM against independent original
Int32 references, exact output duration/rate/channels, convenience-versus-stream
fragment equality, repeated conversion, source/clock/layout/precision guards,
CRC rejection before factories, early return, factory/disposal failure and abort.
Compact evidence is saved in
`results/media-components/codec-expansion/tak-compositions.json`.

The browser fixture preserves the whole original canonical TAK file, its
original SHA256, and all independently decoded PCM. Media and reference files
stay in ignored scratch storage. Browser delivery and public recipe admission
are separate qualification steps.

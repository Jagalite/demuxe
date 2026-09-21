# Demuxe screened idea index — D01–D73

This index consolidates the temporary **D-labels** used during focused screening. They are provenance labels only, **not canonical repository R-numbers**. Before creating a new research item, search the current Demuxe catalogue for the same mechanism and append/merge into the existing item when appropriate.

| ID | Batch | Screened idea | Repo snapshot read by that batch |
|---|---:|---|---|
| D01 | 01 | AAC Program Config Element normalization | `01611bdaa2d9` |
| D02 | 01 | Same-size selected-track fMP4 projection | `01611bdaa2d9` |
| D03 | 01 | Do not widen AVC length prefixes without a demonstrated need | `01611bdaa2d9` |
| D04 | 01 | Strengthen six-channel native FLAC to whole-buffer 24-bit exactness | `01611bdaa2d9` |
| D05 | 01 | Publish decompressed packets only after complete validation | `01611bdaa2d9` |
| D06 | 01 | Source-defined compatibility islands, without claiming handoff | `01611bdaa2d9` |
| D07 | 01 | Let a native sink expose minimal repair sets, but not define validity | `01611bdaa2d9` |
| D08 | 02 | Canonicalize an exactly representable explicit AAC sample rate | `01611bdaa2d9` |
| D09 | 02 | Make existing fragments relocatable by repairing their address metadata | `01611bdaa2d9` |
| D10 | 02 | Synthesize missing decode-time headers from proven continuity | `01611bdaa2d9` |
| D11 | 02 | Require a complete set of repairs before deciding a route is impossible | `01611bdaa2d9` |
| D12 | 02 | A validated packet still needs a current source owner before publication | `01611bdaa2d9` |
| D13 | 02 | A route needs track-output and timing witnesses, not only video and EOF | `01611bdaa2d9` |
| D14 | 03 | Jointly declare selected tracks before beginning native playback | `01611bdaa2d9` |
| D15 | 03 | A remux must retain both gain and end trimming | `01611bdaa2d9` |
| D16 | 03 | A true simple FLAC carrier: feasible, not automatically cheaper | `01611bdaa2d9` |
| D17 | 03 | Keep video ownership stable through an audio codec change | `01611bdaa2d9` |
| D18 | 03 | A decoding success is not an integrity verdict | `01611bdaa2d9` |
| D19 | 03 | Match the numerical contract without expanding the samples | `01611bdaa2d9` |
| D20 | 03 | Eliminate disagreement in color interpretation, not coded pictures | `01611bdaa2d9` |
| D21 | 04 | Source-bound reconstruction of abbreviated JPEG frames | `01611bdaa2d9` |
| D22 | 04 | Translate known static orientation into the browser's presentation metadata | `01611bdaa2d9` |
| D23 | 04 | Select independent FLAC channels without decoding their samples | `01611bdaa2d9` |
| D24 | 04 | Give RLE subtitle bitmaps to a native PNG decoder without a raster intermediate | `01611bdaa2d9` |
| D25 | 04 | Cold APNG seeks using native PNG subframe views and disposal-aware plans | `01611bdaa2d9` |
| D26 | 05 | Explicit mono duplication and silent slots through Opus mapping | `01611bdaa2d9` |
| D27 | 05 | Configuration changes without an automatic player rebuild | `01611bdaa2d9` |
| D28 | 05 | Reset parsing and reject stale completions before retry | `01611bdaa2d9` |
| D29 | 05 | Metadata-only cropping: valid coded output, wrong browser presentation | `01611bdaa2d9` |
| D30 | 05 | Trimming presentation must not delete decode prerequisites | `01611bdaa2d9` |
| D31 | 06 | Change packet grouping after startup rather than imposing one latency policy | `01611bdaa2d9` |
| D32 | 06 | Rewrap G.711 telephony audio rather than decoding it in application code | `01611bdaa2d9` |
| D33 | 06 | Can finite MP4 edit metadata express exact audio excerpts? | `01611bdaa2d9` |
| D34 | 06 | Recover original JPEG bytes from JPEG-origin JPEG XL, then use browser JPEG decoding | `01611bdaa2d9` |
| D35 | 06 | Preserve exact edits by moving selection to the native audio scheduler | `01611bdaa2d9` |
| D36 | 07 | Author a source-indexed edited MP4, then leave playback to the browser | `01611bdaa2d9` |
| D37 | 07 | Refer to repeated coded pictures twice without storing them twice | `01611bdaa2d9` |
| D38 | 07 | Admit a useful seek GOP without waiting for earlier GOPs | `01611bdaa2d9` |
| D39 | 07 | Reuse AVIF coded images as timed AV1 samples, with a presentation gate | `01611bdaa2d9` |
| D40 | 08 | Select whole Opus elementary streams rather than reconstructing every channel | `01611bdaa2d9` |
| D41 | 08 | Restore stripped headers after unlacing, not once per block | `01611bdaa2d9` |
| D42 | 08 | Chained audio needs independent configuration, trimming, and decoder state | `01611bdaa2d9` |
| D43 | 08 | Bounded native resampling needs more than a nominal rate ratio | `01611bdaa2d9` |
| D44 | 09 | Try an unchanged native destination before projecting sample descriptions | `015004be024f` |
| D45 | 09 | A recovery point is not necessarily a native cold-start point | `015004be024f` |
| D46 | 09 | Treat codec/container color conflicts as an authority problem | `015004be024f` |
| D47 | 09 | Bounded Vorbis views across short/long blocks | `015004be024f` |
| D48 | 10 | Byte availability is not the complete MP3 output state | `efd9e1537666` |
| D49 | 10 | Crop the native presentation, not the encoded image | `efd9e1537666` |
| D50 | 10 | Reduce an epoch while timestamps are still integers | `efd9e1537666` |
| D51 | 10 | Express a requested crossfade in the browser audio graph | `efd9e1537666` |
| D52 | 11 | Preserve explicit silent time with constant FLAC frames | `0060c26c2329` |
| D53 | 11 | A sub-millisecond eviction error can discard a full extra GOP | `0060c26c2329` |
| D54 | 11 | Project source subtitles onto an edited native timeline | `0060c26c2329` |
| D55 | 11 | Render bounded finite-filter requests with stable native channel state | `0060c26c2329` |
| D56 | 12 | Preserve an explicit cadence with coded picture recalls | `0060c26c2329` |
| D57 | 12 | Sparse audio can be scheduled without expanding its held spans | `0060c26c2329` |
| D58 | 12 | Give a native IIR filter only enough history for a declared error budget | `0060c26c2329` |
| D59 | 13 | Native JPEG decoding for restricted TIFF pages and regions | `6feb9b337889` |
| D60 | 13 | Destination-specific recovery of mislabeled random-access samples | `6feb9b337889` |
| D61 | 13 | One bounded copy can make native audio looping correct | `6feb9b337889` |
| D62 | 14 | Retain PGS object data, not stale rendered subtitles | `6feb9b337889` |
| D63 | 14 | Native clipping of lossless audio at individual sample boundaries | `6feb9b337889` |
| D64 | 14 | Join independent FLAC selections without creating a new encoded bridge | `6feb9b337889` |
| D65 | 15 | Select an Ogg logical stream by retaining its original pages | `ee7fe7774270` |
| D66 | 15 | Separate source-local track numbering from playback-lane numbering | `ee7fe7774270` |
| D67 | 15 | Native image decoding with a source-derived animation seek plan | `ee7fe7774270` |
| D68 | 16 | Preserve PCM values while changing only the incompatible representation | `ee7fe7774270` |
| D69 | 16 | Translate the packet table, not just the packet bytes | `ee7fe7774270` |
| D70 | 16 | Give native text the syllable timeline rather than repainting it in JavaScript | `ee7fe7774270` |
| D71 | 17 | Compressed-only reverse views of independently decodable video | `ee7fe7774270` |
| D72 | 17 | Preserve sparse-video durations instead of guessing a constant frame rate | `ee7fe7774270` |
| D73 | 17 | Resolve geometry at the boundary that actually presents it | `ee7fe7774270` |

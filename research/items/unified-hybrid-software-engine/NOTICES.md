<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Provenance and licenses

Original reports and result records are CC BY 4.0. Independent Python/JavaScript test tooling under tests/ is Apache-2.0. Copied and modified mpv, native and player runtime sources retain their existing notices and grants, including GPL-3.0-or-later player integration. The combined Wasm engines retain the shipping dependency terms; see ../../../docs/LICENSING.md and ../../../third_party/notices.json. No binary is relicensed by the research folder.

Baseline engines, frozen runtime, original link command and fixture references come from the immutable granular-engine-loading screen-01 and full-study-02 runs. This run links the original full static FFmpeg archives unchanged. The unified presentation adapter derives from experiments/retained-subtitles/vo_libmpv.c, whose original source and patch are preserved in the run.

Synthetic H.264/AAC/ASS and derived rotation fixtures are generated research media; generator commands and hashes are retained. DejaVuSans.ttf retains the license shipped with the frozen runtime. The external user MKV and any derived frames are NOASSERTION; the MKV remains at /Volumes/seed2/Projects/startup-repro/software_test_slow.mkv and is not copied into this item. A standalone distribution must include the referenced dependency notices and license texts; this research directory alone is not a complete redistributable source package.

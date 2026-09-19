<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Contributing

Contribute original reusable code under **Apache-2.0**,
original player/integration code under **GPL-3.0-or-later**, and original reports
and result data under **CC BY 4.0**, as mapped in `licensing/boundaries.json`.
Only submit material you are entitled to license on those terms. Preserve all
third-party copyright and license notices. Existing third-party and archived
source does not acquire new terms from its containing directory.

Use an SPDX header for maintained executable source. Place it after a shebang
where present. Use `Apache-2.0` for reusable files and `GPL-3.0-or-later` for
player/integration files. Reports may use an HTML comment with `CC-BY-4.0`; immutable
evidence and files without comments are annotated by the boundary manifest.

Run `npm run build`, `npm run check:licenses` and `npm run test:licenses`.
Adding a core module requires an explicit entry in `coreSources`; its entire
import and asset closure must stay inside that list. Add third-party dependencies
only after reviewing their actual terms and updating the separate notice inventory.
Do not change a preserved hash merely to silence a failure: review the source,
notice and provenance change first. CI checks consistency, not copyright ownership.

Changing an existing contributor's license requires the relevant rightsholder's
permission. The split license grants apply only to Demuxe-controlled original
material. Git authorship alone is not proof of ownership or relicensing authority.

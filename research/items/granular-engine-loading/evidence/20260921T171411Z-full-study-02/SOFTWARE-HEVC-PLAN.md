<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Follow-up within full study: one-codec Software bundle

Before building or measuring this variant: common-codec bundle covers several videos but saves less than 20% compressed. Investigate a finite HEVC-only video Software bundle, retaining original audio/subtitle entries and their registration order. This tests a coarser independently loaded runtime for the reported Firefox HEVC workload; it is not a runtime-linked codec module. Other video codecs must select the full engine through inspected metadata. Additional transfer and duplicate core code for switching codecs are explicit costs.

Use same Software baseline and user HEVC source. Require full-frame oracle MAE <=6, baseline MAE <=2, seek/replace/destroy checks, and preflight H264/MPEG4 fallback. Then three alternating pairs Firefox local and 10Mbps/80ms against newly measured baseline, not reused timings from another phase. Primary thresholds unchanged: 20% gzip reduction plus 10% and 100ms startup reduction. No shipping integration.

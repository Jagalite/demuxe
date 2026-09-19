<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual libopus 20/40/60ms regrouping reduces codec packets from 101 to 51/34 and splits back to byte-identical constituent packets. Complete host and Chrome PCM preserve all 96000 samples and trim; incompatible TOC rejected. One-packet-per-page candidate files (21770/21355 bytes) remain larger than the original multipacket-page Ogg (20487 bytes). Aggregation adds 20/40ms availability wait. Viable submission-count tradeoff, not a bandwidth or CPU win.

Actual libopus 20/40/60ms regrouping reduces codec packets from 101 to 51/34 and splits back to byte-identical constituent packets. Complete host and Chrome PCM preserve all 96000 samples and trim; incompatible TOC rejected. One-packet-per-page candidate files (21770/21355 bytes) remain larger than the original multipacket-page Ogg (20487 bytes). Aggregation adds 20/40ms availability wait. Viable submission-count tradeoff, not a bandwidth or CPU win.

Limits: Not production integration, no seek or live-stream timing qualification.; File-size counts and theoretical aggregation wait are not performance measurements.; Registration reconciles completed pre-migration evidence; does not claim execution at registration timestamp.

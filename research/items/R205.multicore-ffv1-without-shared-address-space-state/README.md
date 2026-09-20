<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Multicore FFV1 without shared address-space state

Disposition: **stop_current_profile**. correctness: **passed**, performance: **failed**.

Prepared four FFV1quadrant processes now compared with one fullFFV1process using4decoderthreads. Both outputs equal independently generated originaltestsrc visibleBGR for all12frames, wrongquadrant swapfails, freshprocessowners exit. OriginalBGR0 source differs only in unusedfourthbyte255vsdecoded0; allmeaningfulcolorbytes alreadyexact. Canonicalunusedpadding0 plus preservedrawsource/failure providesexactstorage comparison without pixel tolerancechange. Wholecoldprocess/decode/transfer/parentassembly/check/exit task: candidate34.364ms versusbaseline29.464ms, saving-16.63% bootstrap95[-20.89214325936353, -10.998241648882413]; candidate slower, fails10%gate. Preparedcompressedbytes increase24351to28965; encodingcost excluded and no originalsliceextraction orbrowserworker claim. Stop this native preparedquadrant smallprofile; no justificationfor porting it on these results.

Next: Reopen only for specified larger independently addressable FFV1 workload with full preparation/storage/owner cost and a declared browser implementation target; current tiny preparedquadrant path is slower.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T211705Z-prepared-cost/analysis.md)

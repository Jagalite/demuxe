<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Find where hardware decoding loses on short jobs

Disposition: **pursue**. correctness: **passed**, performance: **failed**.

Actualruntime CDPMedia attribution in untimed12frame probe: prefer-software selects VpxVideoDecoder/platform=false; prefer-hardware selects VideoToolboxVideoDecoder/platform=true. Sameconfig hints measured uninstrumented in nine paired1/12/72frame serialized VP9jobs; every output plane hash/PTS exact independenthost. Completeconfigure/decode/copy/hash/flush/close wallcost, not decode-onlythroughput. 1frames: software2.022ms, platform7.011ms, platformsaving-246.70% bootstrap95[-351.381214809179, -180.85106428849204]; 12frames: software4.067ms, platform26.844ms, platformsaving-560.11% bootstrap95[-627.792207606427, -490.02695436107524]; 72frames: software12.344ms, platform111.989ms, platformsaving-807.20% bootstrap95[-883.0223887823115, -729.1270529213224]. Platformcandidate fails allpredeclared10%benefitgates and is consistentlyslower; finding supports softwarepreference for this smallCPU-readback job profile only. Backenddiagnostic capturedoutside timing toavoid observercost; no proofphysicalhardwareunit/energy or display-only/highresolutioncrossover. No automaticroutingchange.

Next: Scoped short-job research complete with platformcandidate rejected and softwarepreferred in this measured CPU-readback profile. A production dispatch policy or crossover for larger/display-resident jobs requires separatelydeclared workload and backend attribution.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T212248Z-short-jobs/analysis.md)

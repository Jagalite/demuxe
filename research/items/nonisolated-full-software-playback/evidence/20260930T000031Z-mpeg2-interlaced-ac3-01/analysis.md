<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental finite private Software playback; continuous correctness

Status: failed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "asyncify",
    "key": null,
    "passed": false,
    "error": null,
    "continuity": {
      "elapsedMs": 37013,
      "frames": 1002,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 463,
      "maxNativeAVSyncSeconds": 0.0680000000000085,
      "avsyncApplicable": true,
      "thresholds": {
        "minimumFrameRatio": 0.9,
        "maximumPresentationGapMs": 250,
        "maximumNativeAVSyncSeconds": 0.1,
        "durationToleranceSeconds": 1
      },
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": false
    },
    "audio": {
      "type": "inspection",
      "id": "end",
      "epoch": 10,
      "read": 0,
      "written": 0,
      "failed": null,
      "stopped": true,
      "underruns": 394,
      "stale": 0,
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 8.140696251130898e-09,
        "offsetFrames": 256
      },
      "samples": 3453440,
      "passed": true,
      "fullReference": {
        "rmse": 8.05225360629679e-09,
        "comparedSamples": 3453440,
        "comparedSeconds": 35.973333333333336,
        "unmatchedTailSamples": 0,
        "thresholds": {
          "rmse": 0.002,
          "maximumMissingSeconds": 0.1,
          "maximumUnmatchedTailSamples": 9600
        }
      },
      "underrunPhases": {
        "expectedFrames": 1727744,
        "terminal": 0,
        "controls": 0,
        "unclassified": 330,
        "inSource": 64
      },
      "continuityPassed": false
    }
  }
]
```

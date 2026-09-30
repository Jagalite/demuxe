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
      "elapsedMs": 36199,
      "frames": 1067,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 303,
      "maxNativeAVSyncSeconds": 0.12033333333319263,
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
      "underruns": 76,
      "stale": 0,
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 1.2503259785261168e-05,
        "offsetFrames": 0
      },
      "samples": 3456000,
      "passed": true,
      "fullReference": {
        "rmse": 1.2493173230630267e-05,
        "comparedSamples": 3456000,
        "comparedSeconds": 36,
        "unmatchedTailSamples": 0,
        "thresholds": {
          "rmse": 0.002,
          "maximumMissingSeconds": 0.1,
          "maximumUnmatchedTailSamples": 9600
        }
      },
      "underrunPhases": {
        "expectedFrames": 1729152,
        "terminal": 0,
        "controls": 0,
        "unclassified": 12,
        "inSource": 64
      },
      "continuityPassed": false
    }
  }
]
```

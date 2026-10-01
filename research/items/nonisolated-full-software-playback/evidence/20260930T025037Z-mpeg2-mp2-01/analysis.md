<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental finite private Software playback; continuous correctness

Status: passed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "asyncify",
    "key": null,
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35974,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "audioEOF": {
        "epoch": 10,
        "header": [
          1727519,
          1726464,
          1,
          10,
          48000,
          0,
          1,
          10
        ],
        "eofReached": true
      },
      "maxPresentationGapMs": 71,
      "maxNativeAVSyncSeconds": 0.03233194444427312,
      "avsyncApplicable": true,
      "thresholds": {
        "minimumFrameRatio": 0.9,
        "maximumPresentationGapMs": 250,
        "maximumNativeAVSyncSeconds": 0.1,
        "durationToleranceSeconds": 1
      },
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {
      "type": "inspection",
      "id": "end",
      "epoch": 10,
      "read": 0,
      "written": 0,
      "failed": null,
      "stopped": true,
      "underruns": 0,
      "stale": 0,
      "maxQueued": 32768,
      "contextState": "closed",
      "reference": {
        "rmse": 0,
        "offsetFrames": 481
      },
      "samples": 3452928,
      "passed": true,
      "fullReference": {
        "rmse": 0,
        "comparedSamples": 3452928,
        "comparedSeconds": 35.968,
        "unmatchedTailSamples": 0,
        "thresholds": {
          "rmse": 0.002,
          "maximumMissingSeconds": 0.1,
          "maximumUnmatchedTailSamples": 9600
        }
      },
      "underrunPhases": {
        "expectedFrames": 1727519,
        "terminal": 0,
        "controls": 0,
        "unclassified": 0,
        "inSource": 0
      },
      "continuityPassed": true
    }
  }
]
```

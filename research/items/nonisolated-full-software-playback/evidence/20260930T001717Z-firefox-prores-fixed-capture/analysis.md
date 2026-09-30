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
      "elapsedMs": 36058,
      "frames": 1064,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 183,
      "maxNativeAVSyncSeconds": 0.024000000000718558,
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
      "underruns": 9,
      "stale": 0,
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 0,
        "offsetFrames": 0
      },
      "samples": 3454720,
      "passed": true,
      "fullReference": {
        "rmse": 0,
        "comparedSamples": 3454720,
        "comparedSeconds": 35.986666666666665,
        "unmatchedTailSamples": 0,
        "thresholds": {
          "rmse": 0.002,
          "maximumMissingSeconds": 0.1,
          "maximumUnmatchedTailSamples": 9600
        }
      },
      "underrunPhases": {
        "expectedFrames": 1728000,
        "terminal": 0,
        "controls": 0,
        "unclassified": 0,
        "inSource": 9
      },
      "continuityPassed": false
    }
  }
]
```

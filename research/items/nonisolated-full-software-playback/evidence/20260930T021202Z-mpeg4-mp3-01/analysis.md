<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental finite private Software playback; continuous correctness

Status: failed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "jspi",
    "key": null,
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36011.79999999702,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "audioEOF": {
        "epoch": 10,
        "header": [
          1729152,
          1728384,
          1,
          10,
          48000,
          5813,
          1,
          10
        ],
        "eofReached": true
      },
      "maxPresentationGapMs": 45.099999994039536,
      "maxNativeAVSyncSeconds": 0.007853666667088532,
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
        "rmse": 1.2503259785261168e-05,
        "offsetFrames": 0
      },
      "samples": 3456768,
      "passed": true,
      "fullReference": {
        "rmse": 1.2493177332026236e-05,
        "comparedSamples": 3456768,
        "comparedSeconds": 36.008,
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
        "unclassified": 0,
        "inSource": 0
      },
      "continuityPassed": true
    }
  },
  {
    "backend": "asyncify",
    "key": null,
    "passed": false,
    "error": null,
    "continuity": {
      "elapsedMs": 36010.20000000298,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "audioEOF": {
        "epoch": 10,
        "header": [
          1729152,
          1728384,
          1,
          10,
          48000,
          5813,
          1,
          10
        ],
        "eofReached": true
      },
      "maxPresentationGapMs": 46.8999999910593,
      "maxNativeAVSyncSeconds": 0.013187000000261406,
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
      "underruns": 2,
      "stale": 0,
      "maxQueued": 32768,
      "contextState": "closed",
      "reference": {
        "rmse": 1.2503259785261168e-05,
        "offsetFrames": 0
      },
      "samples": 3456768,
      "passed": true,
      "fullReference": {
        "rmse": 1.2493177332026236e-05,
        "comparedSamples": 3456768,
        "comparedSeconds": 36.008,
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
        "unclassified": 0,
        "inSource": 2
      },
      "continuityPassed": false
    }
  }
]
```

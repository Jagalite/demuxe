<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental finite private Software playback; continuous correctness

Status: passed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "jspi",
    "key": null,
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36010,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "audioEOF": {
        "epoch": 10,
        "header": [
          1729152,
          1728256,
          1,
          10,
          48000,
          5333,
          1,
          10
        ],
        "eofReached": true
      },
      "maxPresentationGapMs": 50.400000005960464,
      "maxNativeAVSyncSeconds": 0.009000333333220922,
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
      "samples": 3456512,
      "passed": true,
      "fullReference": {
        "rmse": 1.24931501468149e-05,
        "comparedSamples": 3456512,
        "comparedSeconds": 36.00533333333333,
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
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36008.89999999106,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "audioEOF": {
        "epoch": 10,
        "header": [
          1729152,
          1728000,
          1,
          10,
          48000,
          5333,
          1,
          10
        ],
        "eofReached": true
      },
      "maxPresentationGapMs": 44.1000000089407,
      "maxNativeAVSyncSeconds": 0.006333666666670901,
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
      "samples": 3456512,
      "passed": true,
      "fullReference": {
        "rmse": 1.24931501468149e-05,
        "comparedSamples": 3456512,
        "comparedSeconds": 36.00533333333333,
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
  }
]
```

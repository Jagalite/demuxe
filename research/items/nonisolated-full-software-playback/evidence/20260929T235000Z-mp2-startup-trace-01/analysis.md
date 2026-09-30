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
      "elapsedMs": 36003.29999999702,
      "frames": 1079,
      "maxPresentationGapMs": 58.29999999701977,
      "maxNativeAVSyncSeconds": 0.015998944444497454,
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
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 0,
        "offsetFrames": 481
      },
      "samples": 3453952,
      "passed": true,
      "fullReference": {
        "rmse": 0,
        "comparedSamples": 3453952,
        "comparedSeconds": 35.97866666666667,
        "unmatchedTailSamples": 0,
        "thresholds": {
          "rmse": 0.002,
          "maximumMissingSeconds": 0.1,
          "maximumUnmatchedTailSamples": 9600
        }
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
      "elapsedMs": 35982.79999999702,
      "frames": 1079,
      "maxPresentationGapMs": 49.70000000298023,
      "maxNativeAVSyncSeconds": 0.00966561111105868,
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
      "underruns": 6,
      "stale": 0,
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 0,
        "offsetFrames": 481
      },
      "samples": 3455038,
      "passed": true,
      "fullReference": {
        "rmse": 0,
        "comparedSamples": 3455038,
        "comparedSeconds": 35.989979166666664,
        "unmatchedTailSamples": 0,
        "thresholds": {
          "rmse": 0.002,
          "maximumMissingSeconds": 0.1,
          "maximumUnmatchedTailSamples": 9600
        }
      },
      "continuityPassed": false
    }
  }
]
```

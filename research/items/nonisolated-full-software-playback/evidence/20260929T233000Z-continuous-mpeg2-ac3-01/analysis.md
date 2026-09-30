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
      "elapsedMs": 35976.70000000298,
      "frames": 1079,
      "maxPresentationGapMs": 52,
      "maxNativeAVSyncSeconds": 0.007000333333348152,
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
        "rmse": 8.140696251130898e-09,
        "offsetFrames": 256
      },
      "samples": 3453952,
      "passed": true,
      "continuityPassed": true
    }
  },
  {
    "backend": "asyncify",
    "key": null,
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35978.79999999702,
      "frames": 1079,
      "maxPresentationGapMs": 45.5,
      "maxNativeAVSyncSeconds": 0.006333666666680671,
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
        "rmse": 8.140696251130898e-09,
        "offsetFrames": 256
      },
      "samples": 3454464,
      "passed": true,
      "continuityPassed": true
    }
  }
]
```

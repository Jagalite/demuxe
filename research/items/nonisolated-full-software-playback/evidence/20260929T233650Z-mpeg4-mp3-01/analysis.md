<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental finite private Software playback; continuous correctness

Status: failed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "jspi",
    "key": null,
    "passed": false,
    "error": null,
    "continuity": {
      "elapsedMs": 39701.29999999702,
      "frames": 1079,
      "maxPresentationGapMs": 51.70000000298023,
      "maxNativeAVSyncSeconds": 0.006333666666890281,
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
      "underruns": 0,
      "stale": 0,
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 1.2503259785261168e-05,
        "offsetFrames": 0
      },
      "samples": 3456000,
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
      "elapsedMs": 36000.5,
      "frames": 1079,
      "maxPresentationGapMs": 45.099999994039536,
      "maxNativeAVSyncSeconds": 0.006333666666936466,
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
        "rmse": 1.2503259785261168e-05,
        "offsetFrames": 0
      },
      "samples": 3456512,
      "passed": true,
      "continuityPassed": true
    }
  }
]
```

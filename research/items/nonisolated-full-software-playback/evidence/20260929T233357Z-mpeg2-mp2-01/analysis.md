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
      "elapsedMs": 38596.70000000298,
      "frames": 1080,
      "maxPresentationGapMs": 46.900000005960464,
      "maxNativeAVSyncSeconds": 0.006665611111040803,
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
        "rmse": 0,
        "offsetFrames": 481
      },
      "samples": 3454976,
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
      "elapsedMs": 35980.20000000298,
      "frames": 1078,
      "maxPresentationGapMs": 114.5,
      "maxNativeAVSyncSeconds": 0.020332277777778573,
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
      "samples": 3454464,
      "passed": true,
      "continuityPassed": true
    }
  }
]
```

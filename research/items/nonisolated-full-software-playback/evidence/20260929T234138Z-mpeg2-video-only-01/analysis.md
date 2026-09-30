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
      "elapsedMs": 36009.59999999404,
      "frames": 1081,
      "maxPresentationGapMs": 45.20000000298023,
      "maxNativeAVSyncSeconds": 0,
      "thresholds": {
        "minimumFrameRatio": 0.9,
        "maximumPresentationGapMs": 250,
        "maximumNativeAVSyncSeconds": 0.1,
        "durationToleranceSeconds": 1
      },
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": false
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": null,
    "passed": false,
    "error": null,
    "continuity": {
      "elapsedMs": 36007.40000000596,
      "frames": 1081,
      "maxPresentationGapMs": 47.70000000298023,
      "maxNativeAVSyncSeconds": 0,
      "thresholds": {
        "minimumFrameRatio": 0.9,
        "maximumPresentationGapMs": 250,
        "maximumNativeAVSyncSeconds": 0.1,
        "durationToleranceSeconds": 1
      },
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": false
    },
    "audio": {}
  }
]
```

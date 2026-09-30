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
      "elapsedMs": 36008.09999999404,
      "frames": 1081,
      "audioEpochStable": true,
      "maxPresentationGapMs": 56.79999999701977,
      "maxNativeAVSyncSeconds": 0,
      "avsyncApplicable": false,
      "thresholds": {
        "minimumFrameRatio": 0.9,
        "maximumPresentationGapMs": 250,
        "maximumNativeAVSyncSeconds": 0.1,
        "durationToleranceSeconds": 1
      },
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": null,
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36002.5,
      "frames": 1081,
      "audioEpochStable": true,
      "maxPresentationGapMs": 45.6000000089407,
      "maxNativeAVSyncSeconds": 0,
      "avsyncApplicable": false,
      "thresholds": {
        "minimumFrameRatio": 0.9,
        "maximumPresentationGapMs": 250,
        "maximumNativeAVSyncSeconds": 0.1,
        "durationToleranceSeconds": 1
      },
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  }
]
```

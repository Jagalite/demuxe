<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Accepted bounded six-fixture continuous prototype cases, with exact maintained host/PCM/worklet/engine source matches

Status: passed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "jspi",
    "key": "mpeg2-ac3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35986.19999998808,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 52,
      "maxNativeAVSyncSeconds": 0.007853666666690629,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg2-ac3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35990.40000000596,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 46.5,
      "maxNativeAVSyncSeconds": 0.01585366666667909,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "jspi",
    "key": "mpeg2-interlaced-ac3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35976.60000000894,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 57.400000005960464,
      "maxNativeAVSyncSeconds": 0.007853666666687076,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg2-interlaced-ac3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35982.09999999404,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 45.900000005960464,
      "maxNativeAVSyncSeconds": 0.007853666666687076,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "jspi",
    "key": "mpeg2-mp2",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35988.5,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 44,
      "maxNativeAVSyncSeconds": 0.005665611111396629,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg2-mp2",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35973,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 46.19999998807907,
      "maxNativeAVSyncSeconds": 0.005665611111114188,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "jspi",
    "key": "mpeg4-mp3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36010,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 50.400000005960464,
      "maxNativeAVSyncSeconds": 0.009000333333220922,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg4-mp3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36008.89999999106,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 44.1000000089407,
      "maxNativeAVSyncSeconds": 0.006333666666670901,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "jspi",
    "key": "prores-pcm",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35980.40000000596,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 45.70000000298023,
      "maxNativeAVSyncSeconds": 0.005333666667343806,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "prores-pcm",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35983.70000000298,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 44.099999994039536,
      "maxNativeAVSyncSeconds": 0.005667000000116218,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "jspi",
    "key": "mpeg2-video-only",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36008.09999999404,
      "frames": 1081,
      "audioEpochStable": true,
      "maxPresentationGapMs": 56.79999999701977,
      "maxNativeAVSyncSeconds": 0,
      "avsyncApplicable": false,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg2-video-only",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36002.5,
      "frames": 1081,
      "audioEpochStable": true,
      "maxPresentationGapMs": 45.6000000089407,
      "maxNativeAVSyncSeconds": 0,
      "avsyncApplicable": false,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg2-ac3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36036,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 93,
      "maxNativeAVSyncSeconds": 0.025333333333339425,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg2-interlaced-ac3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36029,
      "frames": 1076,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 130,
      "maxNativeAVSyncSeconds": 0.03200000000001424,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg2-mp2",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35974,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 71,
      "maxNativeAVSyncSeconds": 0.03233194444427312,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg4-mp3",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36077,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 77,
      "maxNativeAVSyncSeconds": 0.02899999999999281,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "prores-pcm",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 35986,
      "frames": 1076,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "maxPresentationGapMs": 119,
      "maxNativeAVSyncSeconds": 0.019000000000602313,
      "avsyncApplicable": true,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": "mpeg2-video-only",
    "passed": true,
    "error": null,
    "continuity": {
      "elapsedMs": 36004,
      "frames": 1081,
      "audioEpochStable": true,
      "maxPresentationGapMs": 70,
      "maxNativeAVSyncSeconds": 0,
      "avsyncApplicable": false,
      "clockEvidence": "Native mpv avsync is an internal diagnostic, not independent physical A/V qualification",
      "passed": true
    },
    "audio": {}
  }
]
```

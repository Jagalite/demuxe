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
      "elapsedMs": 35983.29999999702,
      "frames": 1079,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "audioEOF": {
        "epoch": 10,
        "header": [
          1727744,
          1727488,
          1,
          10,
          48000,
          5813,
          1,
          10
        ],
        "eofReached": true
      },
      "maxPresentationGapMs": 64.1000000089407,
      "maxNativeAVSyncSeconds": 0.023187000000017832,
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
      "underruns": 1,
      "stale": 0,
      "maxQueued": 32768,
      "contextState": "closed",
      "reference": {
        "rmse": 8.140696251130898e-09,
        "offsetFrames": 256
      },
      "samples": 3455488,
      "passed": true,
      "fullReference": {
        "rmse": 8.052167400168975e-09,
        "comparedSamples": 3455488,
        "comparedSeconds": 35.99466666666667,
        "unmatchedTailSamples": 0,
        "thresholds": {
          "rmse": 0.002,
          "maximumMissingSeconds": 0.1,
          "maximumUnmatchedTailSamples": 9600
        }
      },
      "underrunPhases": {
        "expectedFrames": 1727744,
        "terminal": 1,
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
      "elapsedMs": 35979.60000000894,
      "frames": 1077,
      "audioEpoch": 10,
      "audioEpochStable": true,
      "audioEOF": {
        "epoch": 10,
        "header": [
          1727744,
          1727232,
          1,
          10,
          48000,
          5813,
          1,
          10
        ],
        "eofReached": true
      },
      "maxPresentationGapMs": 138.29999999701977,
      "maxNativeAVSyncSeconds": 0.0938536666666856,
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
        "rmse": 8.140696251130898e-09,
        "offsetFrames": 256
      },
      "samples": 3454464,
      "passed": true,
      "fullReference": {
        "rmse": 8.052164145339175e-09,
        "comparedSamples": 3454464,
        "comparedSeconds": 35.984,
        "unmatchedTailSamples": 0,
        "thresholds": {
          "rmse": 0.002,
          "maximumMissingSeconds": 0.1,
          "maximumUnmatchedTailSamples": 9600
        }
      },
      "underrunPhases": {
        "expectedFrames": 1727744,
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

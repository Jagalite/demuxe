<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental finite private Software playback; bounded output/lifecycle

Status: failed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "jspi",
    "key": null,
    "passed": false,
    "error": null,
    "continuity": {},
    "audio": {
      "type": "inspection",
      "id": "end",
      "epoch": 12,
      "read": 0,
      "written": 0,
      "failed": null,
      "stopped": true,
      "underruns": 0,
      "stale": 0,
      "maxQueued": 32768,
      "contextState": "closed",
      "reference": {
        "rmse": 4.9444393264800115e-09,
        "offsetFrames": 256
      },
      "samples": 289024,
      "passed": true
    }
  },
  {
    "backend": "asyncify",
    "key": null,
    "passed": true,
    "error": null,
    "continuity": {},
    "audio": {
      "type": "inspection",
      "id": "end",
      "epoch": 12,
      "read": 0,
      "written": 0,
      "failed": null,
      "stopped": true,
      "underruns": 0,
      "stale": 0,
      "maxQueued": 32768,
      "contextState": "closed",
      "reference": {
        "rmse": 4.9444393264800115e-09,
        "offsetFrames": 256
      },
      "samples": 288512,
      "passed": true
    }
  }
]
```

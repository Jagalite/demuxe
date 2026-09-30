<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental finite private Software playback; bounded output/lifecycle

Status: passed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "jspi",
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
      "underruns": 4,
      "stale": 0,
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 1.2503259785261168e-05,
        "offsetFrames": 0
      },
      "samples": 291426,
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
      "underruns": 4,
      "stale": 0,
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 1.2503259785261168e-05,
        "offsetFrames": 0
      },
      "samples": 291938,
      "passed": true
    }
  }
]
```

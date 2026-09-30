<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental private MPEG-2 video-only playback

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
      "underruns": 0,
      "stale": 0,
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 8.140696251130898e-09,
        "offsetFrames": 256
      },
      "samples": 287744,
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
      "maxQueued": 8192,
      "contextState": "closed",
      "reference": {
        "rmse": 8.140696251130898e-09,
        "offsetFrames": 256
      },
      "samples": 286720,
      "passed": true
    }
  }
]
```

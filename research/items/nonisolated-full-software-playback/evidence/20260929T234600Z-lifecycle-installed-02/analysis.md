<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification record

Experimental finite private Software playback; failure and repeated lifecycle

Status: failed. Raw failures remain retained. Public routing and CPU qualification are separate.

```json
[
  {
    "backend": "jspi",
    "key": null,
    "passed": false,
    "error": "Error: Lifecycle observation deadline\n    at until (http://127.0.0.1:52603/worker.mjs:30:13)\n    at async onmessage (http://127.0.0.1:52603/worker.mjs:88:9)",
    "continuity": {},
    "audio": {}
  },
  {
    "backend": "asyncify",
    "key": null,
    "passed": false,
    "error": "Error: Lifecycle observation deadline\n    at until (http://127.0.0.1:52603/worker.mjs:30:13)\n    at async onmessage (http://127.0.0.1:52603/worker.mjs:88:9)",
    "continuity": {},
    "audio": {}
  }
]
```

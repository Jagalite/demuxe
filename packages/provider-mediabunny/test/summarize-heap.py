# SPDX-License-Identifier: Apache-2.0
# Diagnostic counts include prototypes; inspect paths before labeling instances.
import collections
import json
import sys
from heap_snapshot import HeapSnapshot

heap = HeapSnapshot(json.load(open(sys.argv[1])))
target_names = {'NativePlayer', 'RemuxPlayer', 'ProviderRuntime', 'Player', 'DemuxeRuntime',
                'Worker', 'AbortController', 'SharedProviderAssets', 'PlayerPresentation', 'SessionPreviewProvider'}
counts, targets = collections.Counter(), {}
for index in range(heap.count):
    name, kind = heap.name(index), heap.kind(index)
    if name == 'EventTarget' and kind == 'native':
        constructor = heap.constructor_name(index)
        name = constructor.lstrip('_') if constructor else name
    if name in target_names and kind in ['object', 'native']:
        counts[name] += 1
        targets.setdefault(name, index)
print(json.dumps({'counts': dict(counts), 'paths': {name: heap.strong_path(index) for name, index in targets.items()},
                  'limits': ['Prototype objects can be included; inspect strong paths',
                             'DOM EventTarget class names inferred only from direct prototype constructor',
                             'This is not native allocation or retained-size accounting']}, indent=2))

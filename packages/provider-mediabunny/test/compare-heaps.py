# SPDX-License-Identifier: Apache-2.0
"""Compare diagnostic snapshots from the same V8 isolate with stable node IDs."""
import json
import sys
from heap_snapshot import HeapSnapshot

before, after = [HeapSnapshot(json.load(open(path))) for path in sys.argv[1:3]]
first, last = before.groups(), after.groups()
deltas = []
for key in set(first) | set(last):
    a, b = first.get(key, [0, 0]), last.get(key, [0, 0])
    if a != b:
        deltas.append({'type': key[0], 'name': key[1][:160], 'countDelta': b[0] - a[0], 'selfBytesDelta': b[1] - a[1]})
added = [index for node_id, index in after.by_id.items() if node_id not in before.by_id]
largest = sorted(added, key=lambda index: after.field(index, 'self_size'), reverse=True)[:8]
data_nodes = sorted((i for i in added if after.kind(i) in ['object', 'native', 'array']), key=lambda index: after.field(index, 'self_size'), reverse=True)[:8]
by_type = {}
for row in deltas: by_type[row['type']] = by_type.get(row['type'], 0) + row['selfBytesDelta']
print(json.dumps({
    'status': 'diagnostic-shallow-diff-not-retained-size-proof',
    'assumption': 'Caller established same browser isolate and stable snapshot node IDs',
    'nodeCounts': {'before': before.count, 'after': after.count, 'added': len(added), 'removed': len(set(before.by_id) - set(after.by_id))},
    'selfBytes': {'before': sum(before.field(i, 'self_size') for i in range(before.count)), 'after': sum(after.field(i, 'self_size') for i in range(after.count))},
    'netShallowBytesByType': by_type,
    'largestAddedDataNodes': [{'node': after.describe(i), 'strongPath': after.strong_path(i)} for i in data_nodes],
    'largestPositiveGroups': sorted(deltas, key=lambda row: row['selfBytesDelta'], reverse=True)[:20],
    'largestNegativeGroups': sorted(deltas, key=lambda row: row['selfBytesDelta'])[:10],
    'largestAddedNodes': [{'node': after.describe(i), 'strongPath': after.strong_path(i)} for i in largest],
}, indent=2))

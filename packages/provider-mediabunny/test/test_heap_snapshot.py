# SPDX-License-Identifier: Apache-2.0
import unittest
from heap_snapshot import HeapSnapshot


def fixture():
    return {'snapshot': {'meta': {
        'node_fields': ['type', 'name', 'id', 'self_size', 'edge_count'],
        'node_types': [['synthetic', 'object'], 'string', 'number', 'number', 'number'],
        'edge_fields': ['type', 'name_or_index', 'to_node'],
        'edge_types': [['property', 'weak'], 'string_or_number', 'node']}},
        'nodes': [0, 0, 1, 0, 2, 1, 1, 3, 24, 1, 1, 2, 5, 32, 1, 1, 3, 7, 16, 0],
        'edges': [0, 4, 5, 1, 5, 15, 0, 4, 10, 0, 4, 5],
        'strings': ['root', 'Owner', 'Child', 'WeakOnly', 'next', 'weak']}


class HeapTests(unittest.TestCase):
    def test_paths_ignore_weak_roots_and_terminate_with_cycles(self):
        heap = HeapSnapshot(fixture())
        self.assertEqual([node['name'] for node in heap.strong_path(2)], ['root', 'Owner', 'Child'])
        self.assertIsNone(heap.strong_path(3))
        self.assertEqual(heap.by_id[5], 2)
        self.assertEqual(heap.groups()[('object', 'Child')], [1, 32])

    def test_native_subclass_identity_comes_from_direct_prototype(self):
        data = fixture()
        data['snapshot']['meta']['node_types'][0] += ['native', 'closure']
        data['strings'] += ['EventTarget', '_Player', '__proto__', 'constructor']
        data['nodes'] = [0, 0, 1, 0, 1, 2, 6, 3, 24, 1, 1, 6, 5, 32, 1, 3, 7, 7, 16, 0]
        data['edges'] = [0, 4, 5, 0, 8, 10, 0, 9, 15]
        heap = HeapSnapshot(data)
        self.assertEqual(heap.constructor_name(1), '_Player')
        self.assertIsNone(heap.constructor_name(2))

    def test_ephemeron_value_cannot_make_its_own_weak_key_strong(self):
        data = fixture()
        data['strings'] += ['Table', 'Key', 'Value', 'part of key (Key @5) -> value (Value @7) pair in WeakMap']
        data['nodes'] = [0, 0, 1, 0, 1, 1, 6, 3, 24, 2, 1, 7, 5, 24, 0, 1, 8, 7, 24, 1]
        data['edges'] = [0, 4, 5, 1, 5, 10, 0, 9, 15, 0, 4, 10]
        heap = HeapSnapshot(data)
        self.assertIsNone(heap.strong_path(3))
        self.assertIsNone(heap.strong_path(2))
        data['nodes'][4] = 2
        data['edges'][3:3] = [0, 4, 10]
        heap = HeapSnapshot(data)
        self.assertIsNotNone(heap.strong_path(3))

    def test_rejects_inconsistent_edges_and_duplicate_ids(self):
        data = fixture(); data['nodes'][-1] = 1
        with self.assertRaises(ValueError): HeapSnapshot(data)
        data = fixture(); data['nodes'][7] = 1
        with self.assertRaises(ValueError): HeapSnapshot(data)


if __name__ == '__main__': unittest.main()

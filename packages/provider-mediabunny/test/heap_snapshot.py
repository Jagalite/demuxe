# SPDX-License-Identifier: Apache-2.0
"""Diagnostic V8 snapshot access. Self sizes are not retained/native sizes."""
import collections
import re


class HeapSnapshot:
    def __init__(self, value):
        self.value = value
        meta = value['snapshot']['meta']
        self.fields = {key: i for i, key in enumerate(meta['node_fields'])}
        self.edge_fields = {key: i for i, key in enumerate(meta['edge_fields'])}
        self.width = len(meta['node_fields'])
        self.edge_width = len(meta['edge_fields'])
        self.types = meta['node_types'][self.fields['type']]
        self.edge_types = meta['edge_types'][self.edge_fields['type']]
        self.nodes, self.edges, self.strings = value['nodes'], value['edges'], value['strings']
        if len(self.nodes) % self.width or len(self.edges) % self.edge_width:
            raise ValueError('Truncated snapshot table')
        self.count = len(self.nodes) // self.width
        self.by_id, self.offsets = {}, []
        offset = 0
        for index in range(self.count):
            node_id = self.field(index, 'id')
            if node_id in self.by_id:
                raise ValueError('Duplicate snapshot node id')
            self.by_id[node_id] = index
            self.offsets.append(offset)
            offset += self.field(index, 'edge_count') * self.edge_width
        if offset != len(self.edges):
            raise ValueError('Snapshot edge counts disagree')
        self.previous = None

    def field(self, index, name):
        return self.nodes[index * self.width + self.fields[name]]

    def name(self, index):
        return self.strings[self.field(index, 'name')]

    def kind(self, index):
        return self.types[self.field(index, 'type')]

    def constructor_name(self, index):
        # DOM-backed EventTarget subclasses may be tagged EventTarget rather
        # than their JavaScript class name. Inspect the direct prototype only.
        for prototype, kind, label in self.outgoing(index):
            if kind == 'property' and label == '__proto__':
                for constructor, edge_kind, edge_label in self.outgoing(prototype):
                    if edge_kind == 'property' and edge_label == 'constructor' and self.kind(constructor) == 'closure':
                        return self.name(constructor)
        return None

    def describe(self, index):
        return {'id': self.field(index, 'id'), 'name': self.name(index)[:160],
                'type': self.kind(index), 'selfBytes': self.field(index, 'self_size')}

    def outgoing(self, index):
        for offset in range(self.offsets[index], self.offsets[index] + self.field(index, 'edge_count') * self.edge_width, self.edge_width):
            edge_type = self.edge_types[self.edges[offset + self.edge_fields['type']]]
            child = self.edges[offset + self.edge_fields['to_node']] // self.width
            if child < 0 or child >= self.count:
                raise ValueError('Snapshot edge target is out of bounds')
            label = self.edges[offset + self.edge_fields['name_or_index']]
            if edge_type not in ['element', 'hidden']:
                label = self.strings[label]
            yield child, edge_type, label

    def strong_path(self, index):
        if self.previous is None:
            self.previous = [-1] * self.count
            self.via = [None] * self.count
            self.previous[0] = 0
            queue = collections.deque([0])
            waiting = collections.defaultdict(list)
            def admit(parent, child, kind, label):
                if self.previous[child] != -1: return
                self.previous[child], self.via[child] = parent, (kind, label[:160] if isinstance(label, str) else label)
                queue.append(child)
            while queue:
                parent = queue.popleft()
                for origin, child, kind, label in waiting.pop(parent, []): admit(origin, child, kind, label)
                for child, kind, label in self.outgoing(parent):
                    if kind == 'weak' or self.previous[child] != -1:
                        continue
                    if isinstance(label, str) and 'part of key (' in label:
                        match = re.search(r'part of key \(.*? @(\d+)\) -> value', label)
                        if not match: raise ValueError('Unrecognized ephemeron edge label')
                        key = self.by_id.get(int(match[1]))
                        if key is None: raise ValueError('Ephemeron key is absent')
                        if self.previous[key] == -1:
                            waiting[key].append((parent, child, kind, label))
                            continue
                    admit(parent, child, kind, label)
        if self.previous[index] == -1:
            return None
        path = []
        while True:
            path.append({**self.describe(index), 'edge': self.via[index]})
            if index == 0:
                return list(reversed(path))
            index = self.previous[index]

    def groups(self):
        result = collections.defaultdict(lambda: [0, 0])
        for index in range(self.count):
            key = (self.kind(index), self.name(index))
            result[key][0] += 1
            result[key][1] += self.field(index, 'self_size')
        return result

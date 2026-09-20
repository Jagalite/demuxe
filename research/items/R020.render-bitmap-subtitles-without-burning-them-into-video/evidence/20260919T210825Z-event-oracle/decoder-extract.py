# SPDX-License-Identifier: Apache-2.0
def decode(data):
    at = 0
    events = []
    image = None
    placement = None
    pts = 0
    colors = {}
    while at < len(data):
        if at + 13 > len(data):
            raise ValueError('truncated header')
        if data[at:at + 2] != b'PG':
            raise ValueError('segment signature')
        pts = int.from_bytes(data[at + 2:at + 6], 'big')
        typ = data[at + 10]
        n = int.from_bytes(data[at + 11:at + 13], 'big')
        b = data[at + 13:at + 13 + n]
        if len(b) != n:
            raise ValueError('segment bounds')
        at += 13 + n
        if typ == 22:
            count = b[10]
            placement = None if count == 0 else (int.from_bytes(b[15:17], 'big'), int.from_bytes(b[17:19], 'big'))
            assert count in (0, 1)
        elif typ == 20:
            for i in range(2, len(b), 5):
                index, y, cr, cb, a = b[i:i + 5]
                assert cr == cb == 128
                white = max(0, min(255, round((y - 16) * 255 / 219)))
                colors[index] = (white, white, white, a)
        elif typ == 21:
            assert b[3] == 192
            w = int.from_bytes(b[7:9], 'big')
            h = int.from_bytes(b[9:11], 'big')
            p = 11
            rows = []
            for y in range(h):
                row = []
                while p < len(b):
                    value = b[p]
                    p += 1
                    if value:
                        row.append(value)
                    else:
                        if p >= len(b) or b[p] != 0:
                            raise ValueError('unsupported RLE form')
                        p += 1
                        break
                if len(row) != w:
                    raise ValueError('row width')
                rows.append(row)
            image = rows
        elif typ == 128:
            events.append((pts, placement, image, dict(colors)))
    return events

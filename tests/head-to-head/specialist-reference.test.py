# SPDX-License-Identifier: Apache-2.0
import importlib.util
import math
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location('reference', Path(__file__).with_name('validate-specialist-fixtures.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class Reference(unittest.TestCase):
    def test_pcm_retains_each_channel_without_downmix(self):
        data = struct.pack('<16f', *([.125, .25, .375, .5, -.125, -.25, -.375, -.5] * 2))
        result = m.pcm_reference(data, 8)
        self.assertEqual([r['channel'] for r in result], list(range(8)))
        self.assertEqual([r['rms'] for r in result], [.125, .25, .375, .5] * 2)
        self.assertEqual(len({r['sha256'] for r in result}), 8)

    def test_invalid_pcm_is_not_a_reference(self):
        for data in [b'', b'1234', struct.pack('<2f', math.nan, 0), struct.pack('<2f', 0, math.inf)]:
            with self.assertRaises(AssertionError):
                m.pcm_reference(data, 2)

    def test_container_must_match_row(self):
        probe = {'streams': [{'codec_type': 'video', 'codec_name': 'hevc'},
                             {'codec_type': 'audio', 'codec_name': 'truehd', 'channels': 8, 'channel_layout': '7.1'}],
                 'format': {'duration': '36', 'format_name': 'matroska,webm'}}
        m.validate_container('hevc-truehd', probe)
        probe['format']['format_name'] = 'mov,mp4,m4a,3gp,3g2,mj2'
        with self.assertRaisesRegex(AssertionError, 'Wrong container'):
            m.validate_container('hevc-truehd', probe)


if __name__ == '__main__':
    unittest.main()

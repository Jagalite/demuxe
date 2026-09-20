# SPDX-License-Identifier: Apache-2.0
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('prepare', Path(__file__).with_name('prepare-specialist-fixtures.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class Admission(unittest.TestCase):
    def probe(self, codec='truehd', channels=8, profile=None):
        return {'streams': [{'codec_type':'video','codec_name':'hevc'},
                            {'codec_type':'audio','codec_name':codec,'channels':channels,'channel_layout':'7.1' if channels==8 else '5.1(side)','profile':profile}],
                'format': {'duration':'36'}}

    def test_truehd_requires_eight_channels(self):
        m.validate('hevc-truehd', self.probe())
        with self.assertRaises(AssertionError):
            m.validate('hevc-truehd', self.probe(channels=6))

    def test_dts_core_is_not_ma(self):
        m.validate('hevc-dtshd', self.probe('dts', profile='DTS-HD MA'))
        with self.assertRaises(AssertionError):
            m.validate('hevc-dtshd', self.probe('dts', profile='DTS'))

    def test_plain_eac3_is_not_atmos(self):
        m.validate('hevc-atmos', self.probe('eac3', profile='Dolby Digital Plus + Dolby Atmos'))
        with self.assertRaises(AssertionError):
            m.validate('hevc-atmos', self.probe('eac3'))

    def test_dovi_profile_and_rpu_required(self):
        p = self.probe('eac3')
        d = {'side_data_type':'DOVI configuration record','dv_profile':8,'dv_bl_signal_compatibility_id':1,'rpu_present_flag':1,'bl_present_flag':1}
        p['streams'][0]['side_data_list'] = [d]
        m.validate('dv81', p)
        for name, value in [('dv_profile',5),('dv_bl_signal_compatibility_id',4),('rpu_present_flag',0)]:
            q=copy.deepcopy(p);q['streams'][0]['side_data_list'][0][name]=value
            with self.assertRaises(AssertionError):
                m.validate('dv81', q)

if __name__ == '__main__':
    unittest.main()

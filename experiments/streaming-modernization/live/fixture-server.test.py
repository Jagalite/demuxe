#!/usr/bin/env python3
"""Deterministic origin checks; not playback qualification."""
import importlib.util, pathlib, tempfile, unittest, xml.etree.ElementTree as ET
spec=importlib.util.spec_from_file_location('fixture_server',pathlib.Path(__file__).with_name('fixture-server.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Fixtures(unittest.TestCase):
 def test_hls_preserves_absolute_sequences_and_removes_vod_end(self):
  text='#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n'+''.join(f'#EXTINF:2,\n{i:03}.m4s\n' for i in range(10))+'#EXT-X-ENDLIST\n'
  result=module.hls_media(text,4,8).decode();self.assertIn('#EXT-X-MEDIA-SEQUENCE:4',result);self.assertIn('004.m4s',result);self.assertNotIn('003.m4s',result);self.assertNotIn('008.m4s',result);self.assertNotIn('ENDLIST',result)
 def test_dash_keeps_media_times_and_start_number_when_window_moves(self):
  text=b'<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT20S"><Period duration="PT20S"><AdaptationSet><Representation><SegmentTemplate timescale="1000" startNumber="1"><SegmentTimeline><S t="0" d="2000" r="9"/></SegmentTimeline></SegmentTemplate></Representation></AdaptationSet></Period></MPD>'
  result=ET.fromstring(module.dash_media(text,4,8,1000,1016,8));self.assertEqual(result.get('type'),'dynamic');self.assertNotIn('mediaPresentationDuration',result.attrib)
  template=next(result.iter(module.NS+'SegmentTemplate'));self.assertEqual(template.get('startNumber'),'5');self.assertEqual([int(s.get('t')) for s in template.find(module.NS+'SegmentTimeline')],[8000,10000,12000,14000])
if __name__=='__main__':unittest.main()

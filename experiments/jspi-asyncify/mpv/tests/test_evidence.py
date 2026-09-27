# SPDX-License-Identifier: MIT
import copy,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from evidence import inputs_for,verify_inputs,verify_frames
class EvidenceTests(unittest.TestCase):
 def test_empty_and_missing_inputs(self):
  for profile in ['audio','subtitles']:
   for records in [{},{name:{} for name in list(inputs_for(profile))[1:]}]:
    with self.assertRaisesRegex(ValueError,'required evidence input'):verify_inputs(pathlib.Path('/unused'),records,profile)
 def frame(self,time=1,hash='a'):return {'time':time,'x':4,'y':4,'width':4,'height':4,'bytes':64,'sha256':hash*64}
 def media(self):return {'frames':[self.frame(),self.frame(3,'b'),self.frame(),self.frame()]}
 def test_valid_media(self):verify_frames(self.media(),'media')
 def test_empty_pixels_not_equality_proof(self):
  with self.assertRaisesRegex(ValueError,'frame evidence'):verify_frames({'frames':[]},'media')
 def test_empty_cancel_frame(self):
  with self.assertRaisesRegex(ValueError,'frame evidence'):verify_frames({'frames':[]},'cancel')
 def test_same_cue_is_not_second_cue(self):
  e=self.media();e['frames'][1]['sha256']='a'*64
  with self.assertRaisesRegex(ValueError,'Cue change'):verify_frames(e,'media')
 def test_bad_pixel_geometry(self):
  for field,value in [('bytes',1),('width',0),('x',640),('sha256','not-a-hash')]:
   e=self.media();e['frames'][0][field]=value
   with self.assertRaises(ValueError):verify_frames(e,'media')
 def test_replay_checks_bounds_as_well_as_hash(self):
  e=self.media();e['frames'][2]['x']=8
  with self.assertRaisesRegex(ValueError,'replay'):verify_frames(e,'media')
if __name__=='__main__':unittest.main()

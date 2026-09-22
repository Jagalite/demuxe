# SPDX-License-Identifier: MIT
from build import *
def main():
 ff('-f','lavfi','-i','testsrc2=size=192x112:rate=25:duration=3','-vf','hflip','-an','-c:v','libx264','-threads','1','-preset','fast','-crf','20','-g','25','-bf','2','-x264-params','keyint=25:min-keyint=25:scenecut=0:open-gop=0','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-movflags','+empty_moov+default_base_moof+negative_cts_offsets+frag_keyframe',F/'alternate.mp4')
 m=json.loads((E/'manifest.json').read_text());m['alternate']=split('alternate')
 a=(F/'ledger.init').read_bytes();b=(F/'alternate.init').read_bytes()
 def cfg(x):
  o=x.find(b'avcC');size=int.from_bytes(x[o-4:o],'big');return x[o+4:o-4+size]
 m['alternate']['avcc_equal']=cfg(a)==cfg(b);assert m['alternate']['avcc_equal'];save('manifest.json',m)
if __name__=='__main__':main()

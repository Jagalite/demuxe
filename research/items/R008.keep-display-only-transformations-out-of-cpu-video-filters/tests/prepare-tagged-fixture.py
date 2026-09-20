# SPDX-License-Identifier: Apache-2.0
"""Add explicit BT709 declarations; packet copy preserves original compressed pictures."""
import subprocess,pathlib
p=pathlib.Path('build/research-r008-rotation-01/assets/fixtures')
subprocess.run(['ffmpeg','-v','error','-i',str(p/'h264-pcm16/index.mkv'),'-map','0','-c','copy','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-y',str(p/'r008-bt709.mkv')],check=True)

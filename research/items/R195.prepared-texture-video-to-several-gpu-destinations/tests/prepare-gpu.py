# SPDX-License-Identifier: Apache-2.0
import pathlib,json,struct,subprocess,sys
out=pathlib.Path(sys.argv[1]);rows=[]
for fmt in ['BC1_RGB','BC3_RGBA']:
 for n in range(2):
  ktx=out/f'sequence_transcoded_{fmt}_{n:04}.ktx';b=ktx.read_bytes();header=struct.unpack_from('<13I',b,12);assert header[0]==0x04030201
  offset=64+header[12];size=struct.unpack_from('<I',b,offset)[0];blocks=b[offset+4:offset+4+size]
  png=out/f'sequence_unpacked_{"rgb" if fmt=="BC1_RGB" else "rgba"}_{fmt}_{n:04}.png'
  rgba=subprocess.check_output(['ffmpeg','-v','error','-i',str(png),'-pix_fmt','rgba','-f','rawvideo','-']);assert len(rgba)==16*16*4
  rows.append({'format':'bc1-rgba-unorm' if fmt=='BC1_RGB' else 'bc3-rgba-unorm','frame':n,'blocks':list(blocks),'oracle':list(rgba),'ktx':str(ktx),'reference':str(png)})
(out/'gpu-input.json').write_text(json.dumps(rows))

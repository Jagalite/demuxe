# SPDX-License-Identifier: Apache-2.0
"""Generate the bounded conforming UltraHDR fixture; output directory must be new."""
from pathlib import Path
import subprocess,sys
r=Path(sys.argv[1]);r.mkdir()
for name in ['base','gain']:
 if name=='base':data=bytes(v for y in range(64) for x in range(64) for v in [(32+(x*2+y)%160)]*3);header=b'P6\n64 64\n255\n';flags=['-sample','1x1']
 else:data=bytes((x*3+y)%256 for y in range(64) for x in range(64));header=b'P5\n64 64\n255\n';flags=['-grayscale']
 (r/(name+'.pnm')).write_bytes(header+data);subprocess.run(['cjpeg','-quality','95',*flags,'-outfile',str(r/(name+'-input.jpg')),str(r/(name+'.pnm'))],check=True)
(r/'metadata.cfg').write_text('--maxContentBoost 4 4 4\n--minContentBoost 1 1 1\n--gamma 1.5 1.5 1.5\n--offsetSdr 0.02 0.02 0.02\n--offsetHdr 0.01 0.01 0.01\n--hdrCapacityMin 1\n--hdrCapacityMax 4\n--useBaseColorSpace 1\n')
subprocess.run(['build/catalogue-tools/ultrahdr-build/ultrahdr_app','-m','0','-i',str(r/'base-input.jpg'),'-g',str(r/'gain-input.jpg'),'-f',str(r/'metadata.cfg'),'-z',str(r/'source-uhdr.jpg')],check=True)

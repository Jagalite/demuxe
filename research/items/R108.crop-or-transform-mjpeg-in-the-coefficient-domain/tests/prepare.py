# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib
r=pathlib.Path(sys.argv[1]);results=[]
for n in range(3):
 pgm=r/f'source{n}.pgm';pgm.write_bytes(b'P5\n512 512\n255\n'+bytes((x*7+y*11+(x*y//31)+n*49)%256 for y in range(512) for x in range(512)))
 src=r/f'source{n}.jpg';dst=r/f'crop{n}.jpg'
 subprocess.run(['cjpeg','-quality','85','-grayscale','-outfile',str(src),str(pgm)],check=True)
 subprocess.run(['jpegtran','-copy','none','-perfect','-crop','256x256+128+128','-outfile',str(dst),str(src)],check=True)
 a=json.loads(subprocess.check_output(['build/catalogue-tools/jpeg-coefficients',str(src)]));b=json.loads(subprocess.check_output(['build/catalogue-tools/jpeg-coefficients',str(dst)]));expected=[a['blocks'][y*64+x] for y in range(16,48) for x in range(16,48)];assert expected==b['blocks'] and a['quant']==b['quant']
 def decode(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','rawvideo','-pix_fmt','gray','-'])
 full=decode(src);cropped=b''.join(full[y*512+128:y*512+384] for y in range(128,384));actual=decode(dst);assert cropped==actual
 results.append({'frame':n,'coefficient_count':len(expected)*64,'coefficient_mismatches':0,'quant_mismatches':0,'host_pixel_mismatches':0,'reference_sha256':hashlib.sha256(actual).hexdigest(),'source_bytes':src.stat().st_size,'crop_bytes':dst.stat().st_size})
(r/'prepare-results.json').write_text(json.dumps(results,indent=2)+'\n')

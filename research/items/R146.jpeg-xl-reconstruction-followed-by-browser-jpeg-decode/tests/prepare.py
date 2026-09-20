# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,subprocess,json,hashlib,shutil
r=Path(sys.argv[1]);sources=[Path(x) for x in sys.argv[2:]];rows=[];commands=[]
def call(args,success=True):
 commands.append(args);p=subprocess.run(args,capture_output=True);info=json.loads(p.stdout);assert (p.returncode==0)==success;return info
for i,p in enumerate(sources):
 shutil.copy(p,r/f'original{i}.jpg');a=call(['build/catalogue-tools/jxl-jpeg-reconstruct','encode',str(p),str(r/f'image{i}.jxl'),'1']);b=call(['build/catalogue-tools/jxl-jpeg-reconstruct','decode',str(r/f'image{i}.jxl'),str(r/f'reconstructed{i}.jpg'),'1048576']);assert p.read_bytes()==(r/f'reconstructed{i}.jpg').read_bytes();rows.append({'source':str(p),'jpeg_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'encode':a,'reconstruct':b})
call(['build/catalogue-tools/jxl-jpeg-reconstruct','encode',str(sources[0]),str(r/'no-metadata.jxl'),'0']);(r/'truncated.jxl').write_bytes((r/'image0.jxl').read_bytes()[:24]);(r/'non-jpeg.bin').write_bytes(b'not a JPEG');negative={}
for name,input,mode,cap in [('missing_metadata',r/'no-metadata.jxl','decode','1048576'),('truncated',r/'truncated.jxl','decode','1048576'),('non_jpeg',r/'non-jpeg.bin','encode','1'),('small_output_cap',r/'image0.jxl','decode','32')]:negative[name]=call(['build/catalogue-tools/jxl-jpeg-reconstruct',mode,str(input),str(r/(name+'.rejected')),cap],False);assert not (r/(name+'.rejected')).exists()
(r/'prepare-results.json').write_text(json.dumps({'pairs':rows,'negative_controls':negative,'all_original_JPEG_bytes_exact':True,'decoder_given_only_JXL':True},indent=2));(r/'commands.json').write_text(json.dumps(commands,indent=2));print(negative)

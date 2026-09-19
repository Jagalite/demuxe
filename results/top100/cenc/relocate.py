# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib
r=Path(__file__).parent;b=(r/'original.mp4').read_bytes();candidate=bytearray(b);patches=[]
def walk(a,z):
 while a<z:
  n=int.from_bytes(b[a:a+4],'big');t=b[a+4:a+8];assert n>=8 and a+n<=z
  if t in [b'moov',b'trak',b'mdia',b'minf',b'stbl']:walk(a+8,a+n)
  elif t in [b'stco',b'saio']:
   assert b[a+8:a+12]==bytes(4);count=int.from_bytes(b[a+12:a+16],'big')
   for i in range(count):
    p=a+16+4*i;old=int.from_bytes(b[p:p+4],'big');assert old>=40;candidate[p:p+4]=(old+264).to_bytes(4,'big');patches.append({'type':t.decode(),'old':old,'new':old+264})
  a+=n
walk(0,len(b));candidate=candidate[:40]+(264).to_bytes(4,'big')+b'free'+bytes(256)+candidate[40:];(r/'relocated.mp4').write_bytes(candidate)
key='00112233445566778899aabbccddeeff'
def decode(file,encrypted):return subprocess.check_output(['ffmpeg','-v','error']+(['-decryption_key',key] if encrypted else [])+['-i',str(file),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'])
original=decode(r/'original.mp4',True);actual=decode(r/'relocated.mp4',True);plain=decode('results/top100/mse/red.mp4',False);assert original==actual==plain
senc=b.index(b'senc')-4;size=int.from_bytes(b[senc:senc+4],'big');assert bytes(candidate[senc+264:senc+264+size])==b[senc:senc+size]
assert bytes(candidate[48+264:2324+264])==b[48:2324]
wrong=bytearray(candidate);wrong[senc+264+16]^=1;(r/'wrong-iv.mp4').write_bytes(wrong)
try:bad=decode(r/'wrong-iv.mp4',True);different=bad!=plain
except subprocess.CalledProcessError:different=True
assert different
(r/'result.json').write_text(json.dumps({'scope':'Application-owned AES-CTR sample encryption; container layout relocation patches absolute sample and auxiliary offsets without decrypting candidate samples. Not generic fragmented CENC remux.','patches':patches,'sampleCiphertextExact':True,'sencIVAndSubsamplesExact':True,'independentDecryptedPixelsExact':True,'wrongIVDetected':True,'referenceDecodedSHA256':hashlib.sha256(plain).hexdigest(),'passed':True},indent=2)+'\n')

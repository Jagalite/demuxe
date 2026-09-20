# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import struct,subprocess,json,hashlib
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T210300Z-fragmented-cenc';b=Path('results/top100/cenc/original.mp4').read_bytes();be=lambda *xs:struct.pack('>'+'I'*len(xs),*xs)
def box(t,*body):
 x=b''.join(body);return be(len(x)+8)+t+x
def full(t,flags,*body):return box(t,be(flags),*body)
def boxes(data):
 at=0
 while at<len(data):
  n=int.from_bytes(data[at:at+4],'big');assert n>=8 and at+n<=len(data);yield data[at+4:at+8],data[at+8:at+n];at+=n
saved={}
def rewrite(t,d):
 if t==b'stbl':
  children=dict(boxes(d));saved.update(children);return box(t,box(b'stsd',children[b'stsd']),full(b'stts',0,be(0)),full(b'stss',0,be(0)),full(b'stsc',0,be(0)),full(b'stsz',0,be(0,0)),full(b'stco',0,be(0)))
 if t in [b'moov',b'trak',b'mdia',b'minf']:
  body=b''.join(rewrite(k,x) for k,x in boxes(d));return box(t,body,box(b'mvex',full(b'trex',0,be(1,1,0,0,0)))) if t==b'moov' else box(t,body)
 return box(t,d)
parts=dict(boxes(b));init=box(b'ftyp',parts[b'ftyp'])+rewrite(b'moov',parts[b'moov']);packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-of','json','results/top100/cenc/original.mp4'],stderr=subprocess.DEVNULL))['packets'];payload=b''.join(b[int(p['pos']):int(p['pos'])+int(p['size'])] for p in packets)
def make(dataoffset,auxoffset,senc=saved[b'senc']):
 trun=full(b'trun',0x000701,be(len(packets),dataoffset),b''.join(be(p['duration'],int(p['size']),0x02000000 if 'K'in p['flags'] else 0x01010000) for p in packets))
 return box(b'moof',full(b'mfhd',0,be(1)),box(b'traf',full(b'tfhd',0x020000,be(1)),full(b'tfdt',0,be(packets[0]['dts'])),trun,box(b'saiz',saved[b'saiz']),full(b'saio',0,be(1,auxoffset)),box(b'senc',senc)))
moof=make(0,0);aux=moof.index(b'senc')-4+16;moof=make(len(moof)+8,aux);candidate=init+moof+box(b'mdat',payload);(r/'fragmented.mp4').write_bytes(candidate)
key='00112233445566778899aabbccddeeff'
def decode(file,encrypted):return subprocess.check_output(['ffmpeg','-v','error']+(['-decryption_key',key] if encrypted else [])+['-i',str(file),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],stderr=subprocess.PIPE)
ref=decode('results/top100/mse/red.mp4',False);actual=decode(r/'fragmented.mp4',True);assert actual==ref
wrong=bytearray(saved[b'senc']);wrong[8]^=1;bad=init+make(len(moof)+8,aux,bytes(wrong))+box(b'mdat',payload);(r/'wrong-iv.mp4').write_bytes(bad)
try:wrong_output=decode(r/'wrong-iv.mp4',True);detected=wrong_output!=ref
except subprocess.CalledProcessError:detected=True
assert detected
(r/'construction.json').write_text(json.dumps({'passed':True,'samples':len(packets),'ciphertextExact':True,'sencIVSubsampleBytesExact':True,'mdatPayloadSHA256':hashlib.sha256(payload).hexdigest(),'moofRelativeAuxOffset':aux,'independentFullPixelsExact':True,'wrongIVDetected':True,'scope':'Owned CENC ordinary MP4 sample tables reauthored into one fixed AVC fragment; encrypted sample bytes unchanged, explicit IV/subsample records preserved, relative auxiliary offsets reconstructed. No arbitrary CENC/cbcs/multitrack claim.'},indent=2)+'\n')

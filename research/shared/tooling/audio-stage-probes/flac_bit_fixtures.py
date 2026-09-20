# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,struct,array,math,hashlib
from flac_bits import *
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);commands=[]
def call(a):commands.append(a);return subprocess.check_output(a,stderr=subprocess.DEVNULL)
def decode(f):return call(['ffmpeg','-v','error','-i',str(f),'-f','s32le','-'])
# Original R174 bounded fixed-predictor-zero escape residual20bit mono4096samples.
a=[round(300000*math.sin(i*.071))+((i*37)%29-14) for i in range(4096)];f=frame(0,len(a),1,20,[subframe(a,20,True)]);(p/'fixed20.frame').write_bytes(f);(p/'fixed20.flac').write_bytes(stream([f],1,20,len(a)));prom=promote(f);(p/'promoted24.flac').write_bytes(stream([prom],1,24,len(a)));expected=b''.join(struct.pack('<i',x<<12)for x in a);assert decode(p/'fixed20.flac')==expected==decode(p/'promoted24.flac');r174={'samples':len(a),'exactNormalizedS32':True,'sourceFrameBytes':len(f),'promotedFrameBytes':len(prom),'payloadBitsPreserved':parse_frame(f)['subframes'][0]['bits']&((1<<(parse_frame(f)['subframes'][0]['length']-8))-1)==parse_frame(prom)['subframes'][0]['bits']&((1<<(parse_frame(f)['subframes'][0]['length']-8))-1)}
# Four independent20bit verbatim channels with deliberately nonbyte-aligned257sample subframes.
a=[[round((c+1)*80000*math.sin(i*(.023+c*.031))) for i in range(257)]for c in range(4)];f=frame(0,257,4,20,[subframe(ch,20)for ch in a]);(p/'four20.frame').write_bytes(f);(p/'four20.flac').write_bytes(stream([f],4,20,257));selected=select(f,[3,1]);(p/'selected.flac').write_bytes(stream([selected],2,20,257));expected=b''.join(struct.pack('<i',a[c][i]<<12)for i in range(257)for c in [3,1]);assert decode(p/'selected.flac')==expected;r103={'samples':257,'channels':[3,1],'exactSelectedS32':True,'sourceSubframeBits':[s['length']for s in parse_frame(f)['subframes']],'nonByteAligned':parse_frame(f)['subframes'][0]['length']%8!=0}
controls={}
for name,b in [('crc',f[:-1]+bytes([f[-1]^1])),('truncated',f[:-5])]:
 try:parse_frame(b);raise RuntimeError('accepted')
 except ValueError:controls[name+'Rejected']=True
b=bytearray(f);b[3]=(10<<4)|(5<<1)
try:parse_frame(bytes(b));raise RuntimeError('dependentaccepted')
except ValueError:controls['decorrelatedRejected']=True
try:select(f,[3,3]);raise RuntimeError('duplicateaccepted')
except ValueError:controls['duplicateIntentRejected']=True
# Two independent S16 carriers, no quantization.
r102=[]
for chs in [1,2]:
 total=96000;a=[[round(14000*math.sin(i*(.02+.019*c)))for i in range(total)]for c in range(chs)];frames=[]
 for i,start in enumerate(range(0,total,4096)):
  n=min(4096,total-start);frames.append(frame(i,n,chs,16,[subframe(ch[start:start+n],16)for ch in a]))
 output=stream(frames,chs,16,total,minblock=4096,maxblock=4096);name='verbatim'+str(chs);(p/(name+'.flac')).write_bytes(output);raw=b''.join(struct.pack('<h',a[c][i])for i in range(total)for c in range(chs));(p/(name+'.s16')).write_bytes(raw);expected=b''.join(struct.pack('<i',a[c][i]<<16)for i in range(total)for c in range(chs));assert decode(p/(name+'.flac'))==expected;r102.append({'channels':chs,'frames':total,'exactS16':True,'bytes':len(output)})
(p/'host-results.json').write_text(json.dumps({'R174':r174,'R103':r103,'R102':r102,'controls':controls},indent=2));(p/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');(p/'protocol.json').write_text(json.dumps({'R174':'Onlymono20bitfixed0escape4096samples→24bit4wastedbits, coded residualpayloadbits preserved. ExacthostnormalizedS32/nativefloat; malformed/dependent source reject. Aftercorrectness5pairs fullpromotion+native/hostdecode vs ordinarydecode→FLAC24reencode→same destination;<=0.9cost.', 'R103':'Fourindependent20bit257sample nonbytealignedverbatim subframes; select3,1 bybitcopy, plus synchronizedmonoassembly, noPCMsamples materialized. Everyhost/browser sample againstsourcechannels, dependent/malformed/mismatchedblock rejects. Aftercorrectness5pairs codedselect+decode vs decode-pan-reencode+decode;<=0.9cost.', 'R102':'NativeFLAC destination from authored48kmono/stereoS16verbatim, all96000samples exact; CRC/truncationcontrols. Aftercorrectness5alternating matchedhost author+decode vs ffmpegcompression0/5 fixed4096block+decode, completebytes,cost; candidate<=1.10bestbaseline.'},indent=2));print(json.loads((p/'host-results.json').read_text()))

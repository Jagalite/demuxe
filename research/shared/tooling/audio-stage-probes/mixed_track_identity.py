# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,hashlib
p=pathlib.Path(sys.argv[1]);b=(p/'audio.aac').read_bytes();a=[];i=0
while i<len(b):
 assert b[i]==255 and b[i+1]&240==240
 n=((b[i+3]&3)<<11)|(b[i+4]<<3)|(b[i+5]>>5);h=7 if b[i+1]&1 else 9;a.append('SHA256:'+hashlib.sha256(b[i+h:i+n]).hexdigest());i+=n
assert i==len(b)
def hashes(n):return [r['data_hash'] for r in json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a','-show_packets','-show_data_hash','sha256','-of','json',str(p/n)]))['packets']]
r={'aac':{'packets':len(a),'identical':a==hashes('audio.mp4')},'opus':{'packets':len(hashes('audio.webm')),'identical':hashes('audio.webm')==hashes('audio-opus.mp4')}}
assert all(x['identical'] for x in r.values());(p/'packet-identity.json').write_text(json.dumps(r,indent=2)+'\n');print(r)

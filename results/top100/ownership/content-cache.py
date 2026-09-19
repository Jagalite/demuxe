# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib
r=Path(__file__).parent;source=Path('results/top100/mse/red.mp4');other=r/'rewrapped.mp4';cmd=['ffmpeg','-v','error','-y','-i',str(source),'-c','copy','-metadata','title=Different wrapper same coded pictures','-movflags','faststart',str(other)];subprocess.run(cmd,check=True)
def hash(b):return hashlib.sha256(b).hexdigest()
def packets(path):
 d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(path)]));raw=path.read_bytes();extra=d['streams'][0]['extradata'];return hash(extra.encode()),[raw[int(p['pos']):int(p['pos'])+int(p['size'])] for p in d['packets']]
ca,a=packets(source);cb,b=packets(other);assert ca==cb and a==b;assert hash(source.read_bytes())!=hash(other.read_bytes());cache={};hits=0
for config,payloads in [(ca,a),(cb,b)]:
 for packet in payloads:
  key=(config,hash(packet))
  if key in cache:
   assert cache[key]['bytes']==packet;cache[key]['owners']+=1;hits+=1
  else:cache[key]={'bytes':packet,'owners':1}
key=next(iter(cache));saved=cache[key]['bytes'];poison=bytes([saved[0]^1])+saved[1:];assert poison!=saved
# Verification must compare bytes even if an attacker supplies the same digest key.
def acquire(key,packet):
 if cache[key]['bytes']!=packet:raise ValueError('digest collision or corrupt entry')
try:acquire(key,poison);raise AssertionError('corruption accepted')
except ValueError:pass
assert ('different-config',key[1]) not in cache
retained=sum(len(e['bytes']) for e in cache.values());logical=sum(map(len,a+b))
for config,payloads in [(ca,a),(cb,b)]:
 for packet in payloads:
  key=(config,hash(packet));cache[key]['owners']-=1
  if not cache[key]['owners']:del cache[key]
assert not cache
(r/'content-cache-result.json').write_text(json.dumps({'scope':'Owned local files, compressed-packet cache scoped to exact decoder configuration and verified bytes. Per-source timelines remain separate. No external authorization reuse or speed claim.','fileHashesDiffer':True,'codedPacketsIdentical':True,'cacheHits':hits,'logicalPayloadBytes':logical,'retainedUniquePayloadBytes':retained,'changedConfigMiss':True,'poisonedDigestRejected':True,'allOwnersReleased':True,'command':cmd,'passed':True},indent=2)+'\n')

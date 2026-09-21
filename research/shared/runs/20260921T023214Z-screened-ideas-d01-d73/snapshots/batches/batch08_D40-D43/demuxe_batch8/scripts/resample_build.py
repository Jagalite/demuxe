"""D43 fixtures: finite float PCM to the browser's actual sample-rate converter."""
from common import *
items=[]
for sr,dr,n in [(24000,48000,50003),(44100,48000,110019),(48000,44100,100019)]:
 rng=np.random.default_rng(8843+sr);t=np.arange(n)/sr
 x=(.21*np.sin(2*np.pi*(211*t+80*t*t))+.075*np.sin(2*np.pi*min(10003,sr*.42)*t)+rng.normal(0,.015,n)).astype('<f4')
 for i in [0,31,333,9119,n//2,n-33,n-1]:x[i]=.7 if i%2 else -.6
 name=f'pcm_{sr}_{dr}';(F/(name+'.f32')).write_bytes(x.tobytes());(F/(name+'.wav')).write_bytes(wav_float(x,sr));items.append({'name':name,'sr':sr,'dr':dr,'frames':n,'sha256':sha(x.tobytes())})
save('resample_manifest.json',items);print(items)

for j,n in enumerate([29017,65537]):
 rng=np.random.default_rng(9443+j);x=rng.uniform(-.6,.6,n).astype('<f4');x[n//3:n//2]=0;x[n//2:2*n//3]=.3
 name=f'pcm_24000_48000_stress{j}';(F/(name+'.f32')).write_bytes(x.tobytes());(F/(name+'.wav')).write_bytes(wav_float(x,24000))

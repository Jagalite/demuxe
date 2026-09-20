# SPDX-License-Identifier: Apache-2.0
import sys,pathlib,json,time,statistics,concurrent.futures,hashlib
sys.path.insert(0,'/tmp/demuxe-audio-numeric')
import numpy as np
N=1024;H=256;RATE=.8;WINDOW=np.hanning(N);ADV=2*np.pi*H*np.arange(N//2+1)/N

def local(job):
 cols,steps=job;idx=np.floor(steps).astype(int);frac=steps-idx;a=cols[:,idx];b=cols[:,idx+1];delta=np.angle(b)-np.angle(a)-ADV[:,None];delta-=2*np.pi*np.round(delta/(2*np.pi));inc=ADV[:,None]+delta;prefix=np.concatenate([np.zeros((len(ADV),1)),np.cumsum(inc[:,:-1],axis=1)],axis=1);return (1-frac)*np.abs(a)+frac*np.abs(b),prefix,np.sum(inc,axis=1)
def spectra(x):
 padded=np.pad(x,(N//2,N));return np.fft.rfft(np.stack([padded[i:i+N]*WINDOW for i in range(0,len(padded)-N+1,H)]),axis=1).T

def synth(z):
 frames=np.fft.irfft(z.T,n=N,axis=1)*WINDOW;out=np.zeros((len(frames)-1)*H+N);norm=np.zeros_like(out)
 for i,f in enumerate(frames):out[i*H:i*H+N]+=f;norm[i*H:i*H+N]+=WINDOW**2
 np.divide(out,norm,out=out,where=norm>1e-10);return out[N//2:]
def evaluate(x,parallel=False,wrong=False):
 cols=spectra(x);steps=np.arange(0,cols.shape[1]-1,RATE);initial=np.angle(cols[:,0]);out=[]
 if parallel:
  chunks=np.array_split(steps,4)
  with concurrent.futures.ProcessPoolExecutor(max_workers=4)as pool:rows=list(pool.map(local,[(cols,chunk)for chunk in chunks]))
  carry=initial.copy()
  for mag,prefix,total in rows:out.append(mag*np.exp(1j*(prefix+(initial if wrong else carry)[:,None])));carry+=total
  z=np.concatenate(out,axis=1)
 else:
  phase=initial.copy()
  for step in steps:
   index=int(step);fraction=step-index;a=cols[:,index];b=cols[:,index+1];mag=(1-fraction)*np.abs(a)+fraction*np.abs(b);out.append(mag*np.exp(1j*phase));delta=np.angle(b)-np.angle(a)-ADV;delta-=2*np.pi*np.round(delta/(2*np.pi));phase+=ADV+delta
  z=np.stack(out,axis=1)
 return synth(z)[:round(len(x)/RATE)]
def main():
 p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);t=np.arange(96000)/48000;x=.3*np.sin(2*np.pi*(431*t+23*t*t))+.15*np.sin(2*np.pi*917*t);x[16000:16020]+=.2;(p/'source.f64').write_bytes(x.tobytes());identity=hashlib.sha256(x.tobytes()).hexdigest()
 (p/'protocol.json').write_text(json.dumps({'recipe':'Original simple phase vocoder:1024 Hann,hop256,rate0.8; adjacent magnitude interpolation; phase residual wrap uses NumPy round ties-even; exclusive increment sum across four jobs; main-process inverseFFT and normalized overlap-add, crop to round(input length/rate). Explicitly no transient preservation claim.','correctness':'Independent sequential frame loop vs actual four-process local prefix+ordered offset; waveform absolute tolerance1e-9. Wrong independent phase resets must fail. Source bytes bound by hash, process context closes on completion.','cost':'Five alternating cold source read/hash/STFT/process startup/serialization/local-prefix/composition/iFFT/OLA/cleanup vs sequential frame-loop same endpoint;<=0.9 median.'},indent=2))
 ref=evaluate(x);got=evaluate(x,True);wrong=evaluate(x,True,True);error=float(np.max(np.abs(ref-got)));wrongerror=float(np.max(np.abs(ref-wrong)));assert error<=1e-9 and wrongerror>1e-4;times={'candidate':[],'baseline':[]}
 for trial in range(6):
  for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   start=time.perf_counter_ns();raw=(p/'source.f64').read_bytes();assert hashlib.sha256(raw).hexdigest()==identity;out=evaluate(np.frombuffer(raw,dtype=np.float64),variant=='candidate');ms=(time.perf_counter_ns()-start)/1e6;assert np.max(np.abs(out-ref))<=1e-9
   if trial:times[variant].append(ms)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'reference.f64').write_bytes(ref.tobytes());(p/'candidate.f64').write_bytes(got.tobytes());(p/'results.json').write_text(json.dumps({'outputSamples':len(ref),'maxAbsoluteError':error,'wrongResetError':wrongerror,'tolerance':1e-9,'workerCount':4,'numpy':np.__version__,'scope':'Specified simple phase vocoder; no transient or maintained renderer claim'},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/phase_vocoder_scan.py '+str(p)+'\n');print(error,wrongerror,med,ratio)
if __name__=='__main__':main()

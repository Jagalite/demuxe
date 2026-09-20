# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,struct,json,time,subprocess,statistics,hashlib
sys.path.insert(0,'/tmp/demuxe-audio-numeric')
import numpy as np

def segment(marker,payload):return bytes([255,marker])+struct.pack('>H',len(payload)+2)+payload

def encode(xs):
 h,w=xs.shape;pieces=[]
 for y in range(h):
  for x in range(w):
   pred=128 if x==y==0 else int(xs[y,x-1])if y==0 else int(xs[y-1,x])if x==0 else int(xs[y,x-1])+int(xs[y-1,x])-int(xs[y-1,x-1]);v=(int(xs[y,x])-pred+128)%256-128;cat=abs(v).bit_length();pieces.append(f'{cat:04b}'+(f'{v if v>=0 else v+(1<<cat)-1:0{cat}b}'if cat else''))
 bits=''.join(pieces);bits+='1'*((-len(bits))%8);raw=int(bits,2).to_bytes(len(bits)//8,'big').replace(b'\xff',b'\xff\x00');counts=bytes([0,0,0,9]+[0]*12);return b'\xff\xd8'+segment(196,b'\0'+counts+bytes(range(9)))+segment(195,struct.pack('>BHHBBBB',8,h,w,1,1,17,0))+segment(218,bytes([1,1,0,4,0,0]))+raw+b'\xff\xd9'

def parse(raw):
 if raw[:2]!=b'\xff\xd8':raise ValueError('SOI')
 at=2;shape=None;table=False
 while True:
  if at+4>len(raw)or raw[at]!=255:raise ValueError('marker')
  marker=raw[at+1];size=int.from_bytes(raw[at+2:at+4],'big');payload=raw[at+4:at+2+size];at+=2+size
  if size<2 or at>len(raw):raise ValueError('segment bound')
  if marker==196:
   if payload!=b'\0'+bytes([0,0,0,9]+[0]*12)+bytes(range(9)):raise ValueError('qualified Huffman table')
   table=True
  elif marker==195:
   if len(payload)!=9:raise ValueError('SOF3 length')
   precision,h,w,n,c,s,t=struct.unpack('>BHHBBBB',payload)
   if precision!=8 or (n,c,s,t)!=(1,1,17,0)or not 0<w*h<=1048576:raise ValueError('component/precision/resource profile')
   shape=(h,w)
  elif marker==218:
   if not table or shape is None or payload!=bytes([1,1,0,4,0,0]):raise ValueError('predictor/scan profile')
   break
  else:raise ValueError('unsupported marker/restart')
 if raw[-2:]!=b'\xff\xd9':raise ValueError('EOI')
 entropy=raw[at:-2];unescaped=bytearray();i=0
 while i<len(entropy):
  value=entropy[i];i+=1
  if value==255:
   if i>=len(entropy)or entropy[i]!=0:raise ValueError('stuffing/restart')
   i+=1
  unescaped.append(value)
 bits=''.join(f'{x:08b}'for x in unescaped);pos=0;res=np.empty(shape[0]*shape[1],dtype=np.int64)
 for i in range(len(res)):
  if pos+4>len(bits):raise ValueError('truncated Huffman')
  cat=int(bits[pos:pos+4],2);pos+=4
  if cat>8 or pos+cat>len(bits):raise ValueError('Huffman/category bounds')
  value=int(bits[pos:pos+cat],2)if cat else 0;pos+=cat
  if cat and value<(1<<(cat-1)):value-=((1<<cat)-1)
  res[i]=value
 if len(bits)-pos>7 or any(b!='1'for b in bits[pos:]):raise ValueError('scan trailing data')
 return res.reshape(shape)
def reconstruct(raw):return ((np.cumsum(np.cumsum(parse(raw),axis=1),axis=0)+128)%256).astype(np.uint8)

def main():
 p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);y,x=np.indices((256,384));xs=((x*3+y*7+(x*y)%31)%256).astype(np.uint8);raw=encode(xs);(p/'source.jpg').write_bytes(raw);got=reconstruct(raw);ref=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'source.jpg'),'-pix_fmt','gray','-f','rawvideo','-']);assert got.tobytes()==xs.tobytes()==ref;res=parse(raw);expectedResidual=np.zeros(xs.shape,dtype=np.int64);z=xs.astype(np.int64);expectedResidual[0,0]=z[0,0]-128;expectedResidual[0,1:]=z[0,1:]-z[0,:-1];expectedResidual[1:,0]=z[1:,0]-z[:-1,0];expectedResidual[1:,1:]=z[1:,1:]-z[:-1,1:]-z[1:,:-1]+z[:-1,:-1];expectedResidual=(expectedResidual+128)%256-128;assert np.array_equal(res,expectedResidual);assert np.any(res<0)and np.any(res>0);wrong=((np.cumsum(np.cumsum(res,axis=1),axis=0))%256).astype(np.uint8);assert wrong.tobytes()!=ref;controls={}
 variants={'truncated':raw[:-4]+raw[-2:],'wrongPredictor':raw.replace(bytes([1,1,0,4,0,0]),bytes([1,1,0,1,0,0]),1),'restart':raw[:-2]+b'\xff\xd0'+raw[-2:]}
 for name,data in variants.items():
  try:reconstruct(data);controls[name]=False
  except ValueError:controls[name]=True
 assert all(controls.values());(p/'reference.gray').write_bytes(ref);(p/'candidate.gray').write_bytes(got.tobytes());(p/'protocol.json').write_text(json.dumps({'scope':'Actual Huffman SOF3 grayscale8bit predictor4 pointtransform0 no restarts, bounded one-million pixels. Fixed canonical four-bit category Huffman table0..8; independent FFmpeg decode and authored pixel oracle. Two NumPy modular row/column prefix sums with128 initial seed. No GPU or general JPEG admission.','cost':'Five alternating complete cold Python process/NumPy load/read/entropy parse/two scans/write versus cold FFmpeg decode/write, exact same gray bytes. <=0.9 median; include full startup, no bare scan speed claim.'},indent=2));times={'candidate':[],'baseline':[]}
 for trial in range(6):
  for name in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   dest=p/'timed.gray';args=[sys.executable,__file__,'--decode',str(p/'source.jpg'),str(dest)]if name=='candidate'else['ffmpeg','-v','error','-y','-i',str(p/'source.jpg'),'-pix_fmt','gray','-f','rawvideo',str(dest)];start=time.perf_counter_ns();subprocess.run(args,check=True,capture_output=True);ms=(time.perf_counter_ns()-start)/1e6;assert dest.read_bytes()==ref
   if trial:times[name].append(ms)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'results.json').write_text(json.dumps({'width':384,'height':256,'pixels':len(ref),'independentDecoderExact':True,'allParsedResidualsExact':True,'initialRowColumnExact':bool(np.array_equal(got[0],xs[0])and np.array_equal(got[:,0],xs[:,0])),'wrongSeedDetected':True,'controls':controls,'residualMinimum':int(res.min()),'residualMaximum':int(res.max())},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/jpeg_predictor4_scan.py '+str(p)+'\n');print(med,ratio)
if __name__=='__main__':
 if sys.argv[1]=='--decode':pathlib.Path(sys.argv[3]).write_bytes(reconstruct(pathlib.Path(sys.argv[2]).read_bytes()).tobytes())
 else:main()

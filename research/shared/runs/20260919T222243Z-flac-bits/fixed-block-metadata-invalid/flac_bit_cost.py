# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,time,statistics,array,hashlib
from flac_bits import *
p=pathlib.Path(sys.argv[1]);browser=json.loads((p/'browser-results.json').read_text());r=browser['rows'];assert r[0]['nativeNormalizedExact'] and r[0]['wrongWastedRejected'] and r[1]['selectedExact'] and r[1]['joinedExact'] and all(x.get('integerMismatches',0)==0 for x in r) and r[-1]['renderExact'];commands=[]
def call(a):commands.append(a);return subprocess.check_output(a,stderr=subprocess.DEVNULL)
def decode(f):return call(['ffmpeg','-v','error','-i',str(f),'-f','s32le','-'])
base=['ffmpeg','-v','error','-y'];result={}
for key in ['R174','R103']:
 source=p/('fixed20.flac' if key=='R174' else 'four20.flac');expected=decode(p/('promoted24.flac' if key=='R174' else 'selected.flac'));rows=[]
 for i in range(6):
  for candidate in ([True,False]if i%2==0 else[False,True]):
   t=time.perf_counter();dest=p/(key+'-cost-'+str(candidate)+'.flac')
   if candidate:
    original=source.read_bytes();coded=original[42:];converted=promote(coded)if key=='R174'else select(coded,[3,1]);dest.write_bytes(stream([converted],1 if key=='R174'else 2,24 if key=='R174'else 20,4096 if key=='R174'else 257))
   else:call(base+['-i',str(source)]+(['-af','pan=stereo|c0=c3|c1=c1']if key=='R103'else[])+['-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24',str(dest)])
   actual=decode(dest);elapsed=(time.perf_counter()-t)*1000;assert actual==expected
   if i:rows.append({'pair':i,'candidate':candidate,'ms':elapsed,'bytes':dest.stat().st_size})
 c=statistics.median(r['ms']for r in rows if r['candidate']);b=statistics.median(r['ms']for r in rows if not r['candidate']);result[key]={'rows':rows,'candidateMedianMs':c,'baselineMedianMs':b,'ratio':c/b,'passed':c/b<=.9,'exactOutputSHA256':hashlib.sha256(expected).hexdigest()}
result['R102']=[]
for channels in [1,2]:
 source=p/('verbatim'+str(channels)+'.s16');expected=decode(p/('verbatim'+str(channels)+'.flac'));rows=[]
 for i in range(6):
  for route in (['verbatim','level0','level5']if i%2==0 else['level5','level0','verbatim']):
   t=time.perf_counter();dest=p/f'carrier{channels}-{route}.flac'
   if route=='verbatim':
    a=array.array('h');a.frombytes(source.read_bytes());total=len(a)//channels;frames=[]
    for frameid,start in enumerate(range(0,total,4096)):
     n=min(4096,total-start);subs=[subframe([a[i*channels+c]for i in range(start,start+n)],16)for c in range(channels)];frames.append(frame(frameid,n,channels,16,subs))
    dest.write_bytes(stream(frames,channels,16,total,minblock=1792,maxblock=4096))
   else:call(base+['-f','s16le','-ar','48000','-ac',str(channels),'-i',str(source),'-c:a','flac','-compression_level',route[-1],'-frame_size','4096',str(dest)])
   actual=decode(dest);elapsed=(time.perf_counter()-t)*1000;assert actual==expected
   if i:rows.append({'pair':i,'route':route,'ms':elapsed,'bytes':dest.stat().st_size})
 med={name:statistics.median(r['ms']for r in rows if r['route']==name)for name in ['verbatim','level0','level5']};ratio=med['verbatim']/min(med['level0'],med['level5']);result['R102'].append({'channels':channels,'rows':rows,'medians':med,'ratioToBest':ratio,'passed':ratio<=1.1})
(p/'cost-results.json').write_text(json.dumps(result,indent=2));(p/'cost-commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print({k:([{z:v for z,v in x.items()if z!='rows'}for x in a]if isinstance(a,list)else{z:v for z,v in a.items()if z!='rows'})for k,a in result.items()})

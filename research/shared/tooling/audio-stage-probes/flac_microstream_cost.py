# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib,time,statistics
p=pathlib.Path(sys.argv[1]);old=json.loads((p/'results.json').read_text());assert all(x['wholePCMExact'] and x['corruptedCRCRejected']for x in old.values());(p/'cost-protocol.json').write_text(json.dumps({'scope':'Original whole-file microdecode endpoint has exactPCM/count/duration; libFLAC randomskip is separate failed extension and not silently claimed.','R223':'Fullcoldsource ffprobeindex/read/copy correctedtotal unknownMD5 thenmicrodecode vs fullsource decode+suffixcrop.','R245':'Fullcold ffprobeindex/read/copy correctedtotal, boundedmicroPCM checksumdecode then consumerdecode vs fullsource decode+crop+ordinaryFLACencode+consumerdecode.','threshold':.9,'pairs':5,'ordering':'1warmup5alternating; allactualoutputs exact independent continuousreference eachtrial','seekLimitation':'No candidate supplies native encoded-microfile randomseek. Reopen with headerrebasing changescodedframeidentity and requires separate contract.'},indent=2));commands=[]
def call(a):commands.append(a);return subprocess.check_output(a,stderr=subprocess.DEVNULL)
def decode(f):return call(['ffmpeg','-v','error','-i',str(f),'-f','s16le','-'])
results={}
for key,start,stop in [('R223',42,None),('R245',20,23)]:
 source=p/(key+'-source.flac');offset=old[key]['startSample'];n=old[key]['samples'];expected=decode(source)[offset*4:(offset+n)*4];rows=[]
 for i in range(6):
  for candidate in ([True,False]if i%2==0 else[False,True]):
   t=time.perf_counter();dest=p/(key+'-cost.flac')
   if candidate:
    data=source.read_bytes();packets=json.loads(call(['ffprobe','-v','error','-show_packets','-of','json',str(source)]))['packets'][start:stop];frames=[data[int(x['pos']):int(x['pos'])+int(x['size'])]for x in packets];si=bytearray(data[8:42]);si[10:18]=((int.from_bytes(si[10:18],'big')&~((1<<36)-1))|n).to_bytes(8,'big');si[18:34]=b'\0'*16;dest.write_bytes(b'fLaC\x80\x00\x00\x22'+si+b''.join(frames))
    if key=='R245':
     bounded=decode(dest);si[18:34]=hashlib.md5(bounded).digest();dest.write_bytes(b'fLaC\x80\x00\x00\x22'+si+b''.join(frames))
    actual=decode(dest)
   else:
    actual=decode(source)[offset*4:(offset+n)*4]
    if key=='R245':
     raw=p/'bounded-baseline.s16';raw.write_bytes(actual);call(['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','2','-i',str(raw),'-c:a','flac',str(dest)]);actual=decode(dest)
   ms=(time.perf_counter()-t)*1000;assert actual==expected
   if i:rows.append({'pair':i,'candidate':candidate,'ms':ms})
 c=statistics.median(r['ms']for r in rows if r['candidate']);b=statistics.median(r['ms']for r in rows if not r['candidate']);results[key]={'rows':rows,'candidateMedianMs':c,'baselineMedianMs':b,'ratio':c/b,'passed':c/b<=.9,'originalSequentialCorrectnessPassed':True,'randomSeekExtensionPassed':False,'outputSHA256':hashlib.sha256(expected).hexdigest()}
(p/'cost-results.json').write_text(json.dumps(results,indent=2));(p/'cost-commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print({k:{a:b for a,b in v.items()if a!='rows'}for k,v in results.items()})

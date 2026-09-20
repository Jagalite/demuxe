# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,math,array,json,sys
p=pathlib.Path(sys.argv[1]);data=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'candidate.mp4'),'-map','0:a','-f','s16le','-']);a=array.array('h',data)
N=960;wave=[complex(math.cos(2*math.pi*880*i/48000),-math.sin(2*math.pi*880*i/48000)) for i in range(N)];rows=[]
for centre in [.5,1.25,3.5]:
 bins=[]
 for j in range(int((centre-.18)*48000),int((centre+.18)*48000),240):
  power=abs(sum(a[j+i]*wave[i] for i in range(N)))/N;bins.append(((j+N/2)/48000,power))
 peak=max(v for t,v in bins);active=[(t,v*v) for t,v in bins if v>peak*.5];observed=sum(t*v for t,v in active)/sum(v for t,v in active);rows.append({'expectedCentre':centre,'observedCentre':observed,'errorMs':(observed-centre)*1000,'peak880':peak});assert abs(observed-centre)<=.03,rows
(p/'marker-results.json').write_text(json.dumps({'centroidToleranceMs':30,'rows':rows},indent=2));print(rows)

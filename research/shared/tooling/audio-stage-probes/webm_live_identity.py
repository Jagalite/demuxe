# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib
p=pathlib.Path(sys.argv[1]);source=pathlib.Path('research/shared/runs/20260919T214510Z-mixed-tracks/audio.webm')
def call(a):return subprocess.check_output(a,stderr=subprocess.DEVNULL)
def probe(f):return json.loads(call(['ffprobe','-v','error','-show_packets','-show_streams','-show_data_hash','sha256','-of','json',str(f)]))
def pcm(f):return call(['ffmpeg','-v','error','-i',str(f),'-f','f32le','-'])
a=probe(source);ref=pcm(source);rows=[]
jobs=json.loads((p/'results.json').read_text())['jobs']
for i in [j['id'] for j in jobs if j.get('mode') in ['default','small'] and j.get('code')==0]:
 f=p/f'producer-{i}.webm';b=probe(f);actual=pcm(f);same=[x['data_hash'] for x in a['packets']]==[x['data_hash'] for x in b['packets']];exact=actual==ref;rows.append({'producer':i,'packetCount':len(b['packets']),'packetPayloadsExact':same,'pcmExact':exact,'frames':len(actual)//8,'pcmSHA256':hashlib.sha256(actual).hexdigest(),'initialPadding':b['streams'][0].get('initial_padding'),'lastPacketSideData':b['packets'][-1].get('side_data_list')});assert same and exact
r={'passed':True,'rows':rows,'referenceFrames':len(ref)//8};(p/'identity.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))

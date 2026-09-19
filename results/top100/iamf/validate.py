# SPDX-License-Identifier: Apache-2.0
import json,copy,subprocess,hashlib
from pathlib import Path
r=Path(__file__).parent;g=json.load(open(r/'groups.json'))['stream_groups']
def validate(g):
 assert len(g)==2
 element,mix=g;assert element['type']=='IAMF Audio Element' and mix['type']=='IAMF Mix Presentation';assert element['id']=='0x1' and element['nb_streams']==1
 c=element['components'][0];assert c['nb_layers']==1 and c['audio_element_type']==0;assert c['subcomponents'][0]['channel_layout']=='stereo' and c['subcomponents'][0]['output_gain_flags']==0
 comp=mix['components'][0];assert comp['nb_submixes']==1;sub=next(s for s in comp['subcomponents'] if 'nb_elements' in s);assert sub['nb_elements']==1 and sub['nb_layouts']==1 and sub['default_mix_gain']=='0/256'
 piece=next(p for p in sub['pieces'] if 'stream_id' in p);assert piece['stream_id']==1 and piece['default_mix_gain']=='0/256';assert any(p.get('sound_system')=='stereo' for p in sub['pieces'])
validate(g);wrong=copy.deepcopy(g);next(x for x in wrong[1]['components'][0]['subcomponents'] if 'nb_elements'in x)['default_mix_gain']='256/256'
try:validate(wrong);raise RuntimeError('unsupported gain accepted')
except AssertionError:pass
pcm=lambda f:subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-f','s16le','-'])
a=pcm('results/top100/audio/lossless.wav');b=pcm(r/'component.flac');assert a==b
(r/'presentation-result.json').write_text(json.dumps({'scope':'One declared channel-based stereo element, one zero-gain stereo submix, no parameter blocks; strict applicability validation.','originalSourcePCMExact':True,'unsupportedGainRejected':True,'frames':len(a)//4,'pcmSHA256':hashlib.sha256(a).hexdigest()},indent=2))

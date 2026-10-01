#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
import copy,json,os,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(ROOT/'scripts'));import mpv_composite_source as m
class CompositeSourceTests(unittest.TestCase):
 def test_original_runtime_and_fifteen_corruption_controls(self):
  location=Path(os.environ['MPV_COMPOSITE_MATERIALS']);engine=json.loads((location/'engine-build.json').read_bytes());recovered=json.loads((location/'recovered.json').read_bytes())['recovered'];read=lambda name:Path(recovered[name]).read_bytes();installed=Path(os.environ['MPV_INSTALLED_ASSETS']);runtime={name:(installed/name).read_bytes()for name in engine['artifacts']};self.assertTrue(m.verify_groups(engine,read,runtime))
  mutations=[lambda e:e['nativeGroups'].pop('pthread'),lambda e:e['nativeGroups']['pthread'].update(artifacts=[]),lambda e:e['nativeGroups']['private-playback'].update(artifacts=[]),lambda e:e['nativeGroups']['private-playback'].update(runtimeFiles=[]),lambda e:e['nativeGroups']['pthread']['artifacts'].append(e['nativeGroups']['pthread']['artifacts'][0]),lambda e:e['artifacts']['web/engine-mpv/player.wasm'].update(sha256='0'*64),lambda e:e['nativeGroups']['pthread'].update(recordSHA256='0'*64),lambda e:e['nativeGroups']['private-playback'].update(sourceManifestSHA256='0'*64),lambda e:e['nativeGroups']['private-playback']['maps']['inputs'].pop(next(iter(e['nativeGroups']['private-playback']['maps']['inputs']))),lambda e:e['nativeGroups']['private-playback']['maps']['sources'].pop(next(iter(e['nativeGroups']['private-playback']['maps']['sources']))),lambda e:e['nativeGroups']['private-playback']['maps']['sdkSources'].pop(next(iter(e['nativeGroups']['private-playback']['maps']['sdkSources']))),lambda e:e['nativeGroups']['pthread'].update(excludedConfigurations=[]),lambda e:e['nativeGroups']['private-playback'].update(sourceBuildSHA256='0'*64)]
  for index,mutate in enumerate(mutations):
   with self.subTest(index=index):
    altered=copy.deepcopy(engine);mutate(altered)
    with self.assertRaises((ValueError,KeyError)):m.verify_groups(altered,read,runtime)
  changed=dict(runtime);changed['web/engine-mpv/player.wasm']=b'corrupt'
  with self.assertRaises(ValueError):m.verify_groups(engine,read,changed)
  group=engine['nativeGroups']['private-playback'];altered=copy.deepcopy(engine);raw=json.loads(read(group['sourceBuildInput']));raw['unreviewedTransform']=True;changed_bytes=m.encoded(raw);altered['nativeGroups']['private-playback']['sourceBuildSHA256']=m.sha(changed_bytes)
  with self.assertRaises(ValueError):m.verify_groups(altered,lambda name:changed_bytes if name==group['sourceBuildInput']else read(name),runtime)
  print('Actual original8native artifacts+15corruption controls PASS')
if __name__=='__main__':unittest.main()

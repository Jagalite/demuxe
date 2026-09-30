# SPDX-License-Identifier: Apache-2.0
import hashlib,importlib.util,json,pathlib,tempfile,unittest
spec=importlib.util.spec_from_file_location('assets',pathlib.Path(__file__).resolve().parents[1]/'scripts/private_remux_assets.py');assets=importlib.util.module_from_spec(spec);spec.loader.exec_module(assets)
optional_spec=importlib.util.spec_from_file_location('optional',pathlib.Path(__file__).resolve().parents[1]/'scripts/optional_release.py');optional=importlib.util.module_from_spec(optional_spec);optional_spec.loader.exec_module(optional)
class PrivateMpvAssets(unittest.TestCase):
 def test_private_services_require_exact_archive_consumer_cases(self):
  base=optional.required_consumer_cases({'files':{}})
  private=optional.required_consumer_cases({'files':{'web/engine-mpv-audio-jspi/service.wasm':{}}})
  self.assertEqual(private-base,{'private-mpv-subtitles-auto','private-mpv-subtitles-asyncify','private-mpv-audio-auto','private-mpv-audio-asyncify','private-mpv-composed','private-mpv-cancellation','private-mpv-asset-mismatch'})
 def test_complete_identity_bound_set_and_clean_release(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);(root/'web').mkdir();self.assertEqual(assets.private_mpv_assets(root),{})
   build={'clean':True,'inputs':{'source.c':'hash'},'configurations':{'config.h':'hash'},'privateMpv':{},'artifacts':{}}
   for backend in ['jspi','asyncify']:
    for profile in ['subtitles','audio']:
     folder=f'web/engine-mpv-{profile}-{backend}';p=root/folder;p.mkdir();hashes={}
     for name in ['service.mjs','service.wasm']:
      (p/name).write_text(folder+name);hashes[name]=hashlib.sha256((p/name).read_bytes()).hexdigest();build['artifacts'][folder+'/'+name]={'sha256':hashes[name]}
     (p/'manifest.json').write_text(json.dumps({'schema':1,'backend':backend,'profile':profile,'files':hashes}))
     build['privateMpv'][folder]={'inputs':['source.c'],'configurations':['config.h']}
   for name in ['private-mpv.js','private-mpv/LICENSE.txt','private-mpv/engine.js','private-mpv/scheduler.js','private-mpv/continuations.js','private-mpv/range-source.js','private-mpv/audio-worker.js','private-mpv/audio-worklet.js']:
    p=root/'web'/name;p.parent.mkdir(exist_ok=True);p.write_text(name)
   files=assets.private_mpv_assets(root);self.assertEqual(len(files),20);assets.verify_private_mpv_release(files,build)
   for key in ['clean','privateMpv','artifacts','inputs','configurations']:
    with self.subTest(key=key),self.assertRaises(ValueError):assets.verify_private_mpv_release(files,{**build,key:False if key=='clean' else {}})
   p=root/'web/engine-mpv-audio-jspi/service.wasm';p.write_bytes(b'corrupt')
   with self.assertRaisesRegex(ValueError,'artifact mismatch'):assets.private_mpv_assets(root)
   p.unlink()
   with self.assertRaises(FileNotFoundError):assets.private_mpv_assets(root)
 def test_playback_is_an_independent_complete_pair_with_consumer_gates(self):
  base=optional.required_consumer_cases({'files':{}})
  playback=optional.required_consumer_cases({'files':{'web/engine-mpv-playback-jspi/player.wasm':{}}})
  self.assertEqual(playback-base,{'private-software-jspi','private-software-asyncify','private-software-controls','private-software-cancellation','private-software-asset-mismatch'})
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp)
   for name in ['private-mpv.js','private-mpv/LICENSE.txt','private-mpv/engine.js','private-mpv/scheduler.js','private-mpv/continuations.js','private-mpv/range-source.js','private-mpv/audio-worklet.js','private-mpv/playback-worker.js','private-mpv/playback-host.js','private-mpv/playback-pcm.js']:
    p=root/'web'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(name)
   for backend in ['jspi','asyncify']:
    p=root/f'web/engine-mpv-playback-{backend}';p.mkdir();hashes={}
    for name in ['player.mjs','player.wasm']:
     (p/name).write_text(backend+name);hashes[name]=hashlib.sha256((p/name).read_bytes()).hexdigest()
    (p/'manifest.json').write_text(json.dumps({'schema':1,'backend':backend,'profile':'playback','audioCapacity':32768,'files':hashes}))
    if backend=='jspi':
     with self.assertRaises(FileNotFoundError):assets.private_mpv_assets(root)
   files=assets.private_mpv_assets(root);self.assertEqual(len(files),16)
   with self.assertRaisesRegex(ValueError,'clean'):assets.verify_private_mpv_release(files,{'clean':False})
   with self.assertRaisesRegex(ValueError,'recorded inputs'):assets.verify_private_mpv_release(files,{'clean':True})
   p=root/'web/engine-mpv-playback-asyncify/manifest.json';r=json.loads(p.read_text());r['audioCapacity']=8192;p.write_text(json.dumps(r))
   with self.assertRaisesRegex(ValueError,'capacities differ'):assets.private_mpv_assets(root)
   r['audioCapacity']=32769;p.write_text(json.dumps(r))
   with self.assertRaisesRegex(ValueError,'capacity mismatch'):assets.private_mpv_assets(root)
if __name__=='__main__':unittest.main()

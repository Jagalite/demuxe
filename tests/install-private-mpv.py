# SPDX-License-Identifier: Apache-2.0
"""Replacing a subtitle pair must validate both destinations before writing."""
import importlib.util,json,pathlib,tempfile,unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('installer',pathlib.Path(__file__).resolve().parents[1]/'scripts/install-private-mpv.py')
installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)
class SubtitleInstall(unittest.TestCase):
 def test_verified_pair_replacement_and_drift_rollback(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);build=root/'build';build.mkdir();runtime=root/'runtime'
   def prepare(value):
    for name in ('service.mjs','service.wasm','service.asyncify.wasm'):(build/name).write_text(value+name)
    (build/'result.json').write_text(json.dumps({'artifacts':{name:installer.digest(build/name) for name in ('service.mjs','service.wasm','service.asyncify.wasm')}}))
   prepare('old')
   # Source correspondence has its own tests; this isolates destination safety.
   with patch.object(installer,'verify_build') as verify:
    installer.install(None,runtime,build)
    verify.assert_called_once()
    first=runtime/'web/engine-mpv-subtitles-jspi/service.wasm';second=runtime/'web/engine-mpv-subtitles-asyncify/service.wasm'
    old=first.read_bytes();second.write_bytes(b'unrelated local edit');prepare('new')
    with self.assertRaisesRegex(ValueError,'asset drift'):installer.install(None,runtime,build,True)
    self.assertEqual(first.read_bytes(),old)
    second.write_text('oldservice.asyncify.wasm')
    installer.install(None,runtime,build,True)
    self.assertEqual(first.read_text(),'newservice.wasm');self.assertEqual(second.read_text(),'newservice.asyncify.wasm')
    self.assertFalse((runtime/'web/engine-mpv-audio-jspi').exists())
if __name__=='__main__':unittest.main()

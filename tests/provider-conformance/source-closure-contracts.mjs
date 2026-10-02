// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

test('application closure retains current admission policy independently of catalog source lists', async () => {
  const source = `import importlib.util,json,pathlib,sys,tempfile
sys.path.insert(0,str(pathlib.Path('scripts').resolve()))
spec=importlib.util.spec_from_file_location('source_closure','scripts/package-provider-source.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as directory:
 root=pathlib.Path(directory);(root/'licensing').mkdir()
 (root/'licensing/provider-packages.json').write_text(json.dumps({'playerCoreSources':[],'profiles':{},'targets':{}}))
 (root/'licensing/provider-runtime-qualification.json').write_text(json.dumps({'evidence':[]}))
 (root/'licensing/ci-slices.json').write_text(json.dumps({'include':[{'evidence':'results/ci-only-evidence.json'}]}))
 m.ROOT=root
 print(json.dumps(sorted(m.application_source_paths())))`;
  const {stdout} = await promisify(execFile)('python3', ['-c', source], {maxBuffer:1024*1024});
  const paths = JSON.parse(stdout);
  assert.ok(paths.includes('licensing/provider-runtime-qualification.json'));
  assert.ok(paths.includes('results/ci-only-evidence.json'));
});

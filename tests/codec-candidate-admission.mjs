// SPDX-License-Identifier: Apache-2.0
// Observe default and test-owned candidate admission; this grants no qualification.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
const [deploymentArg, consumerArg, receiptArg] = process.argv.slice(2);
assert.ok(deploymentArg && consumerArg && receiptArg);
const deployment = resolve(deploymentArg), core = join(resolve(consumerArg), 'node_modules/demuxe');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await readFile(join(deployment, 'demuxe-providers.json')), manifest = JSON.parse(manifestBytes);
const providerModule = join(core, 'web/generated/internal/provider-runtime.js'), buildModule = join(core, 'web/generated/internal/provider-build.js');
const {ProviderRuntime} = await import(pathToFileURL(providerModule));
const {qualifiedProviderIdentities} = await import(pathToFileURL(buildModule));
const identities = Object.fromEntries(manifest.providers.map(provider => [provider.id, provider.implementationIdentity]));
const ids = ['ffmpeg-truehd-mlp-asyncify', 'ffmpeg-dts-hd-asyncify'];
for (const id of ids) assert.ok(identities[id] && identities[id] !== qualifiedProviderIdentities[id]);
const server = createServer((_request, response) => {response.setHeader('Content-Type', 'application/json'); response.end(manifestBytes);});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
try {
  const base = new URL(`http://127.0.0.1:${server.address().port}/`), rows = [];
  const altered = {...identities, [ids[1]]: 'sha256:' + '0'.repeat(64)};
  for (const [mode, qualified] of [['default', qualifiedProviderIdentities], ['test-owned', identities], ['test-owned-one-mismatch', altered]]) {
    const runtime = new ProviderRuntime(base, qualified);
    try {
      await runtime.load();
      const offers = Object.fromEntries(ids.map(id => [id, runtime.hasOffer(id, 'flac24')]));
      const assets = Object.fromEntries(ids.map(id => [id, runtime.has(`web/providers/preparation/${id.slice(7)}/engine-adaptation-asyncify/remux.wasm`)]));
      const expected = mode === 'default' ? [false, false] : mode === 'test-owned' ? [true, true] : [true, false];
      assert.deepEqual(ids.map(id => offers[id]), expected); assert.deepEqual(ids.map(id => assets[id]), expected);
      rows.push({mode, offers, assets});
    } finally {await runtime.destroy();}
  }
  const receipt = {status:'finite-codec-admission-comparison-passed-not-release', manifestSHA256:sha(manifestBytes), harnessSHA256:sha(await readFile(fileURLToPath(import.meta.url))), providerModuleSHA256:sha(await readFile(providerModule)), registryModuleSHA256:sha(await readFile(buildModule)), identities:Object.fromEntries(ids.map(id => [id,{default:qualifiedProviderIdentities[id],candidate:identities[id]}])), rows, limits:['Node admission check, not browser playback.', 'Test-owned qualification is an explicit diagnostic and does not approve provider identities.', 'Does not establish the sole cause of the prior unchanged Player gate failure.']};
  await writeFile(receiptArg, JSON.stringify(receipt, null, 2) + '\n'); console.log(JSON.stringify({status:receipt.status,rows:rows.length}));
} finally {await new Promise(resolve => server.close(resolve));}

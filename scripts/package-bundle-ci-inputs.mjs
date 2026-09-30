// SPDX-License-Identifier: Apache-2.0
// Prepare reviewable native CI assets locally. Does not publish a release.
import {readFile,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const output=process.argv[2];if(!output)throw Error('Supply a fresh output directory');await mkdir(output);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const records=JSON.parse(await readFile('build/bundle-flexibility/installed-all.json'));
const core=JSON.parse(await readFile('build/media-components/player-core-production-final-review-02/assembly.json'));
const packages=[];
for(const archive of [core.archive,...records.archives]){
 const bytes=await readFile(archive),metadata=JSON.parse(execFileSync('tar',['-xOf',archive,'package/package.json'],{encoding:'utf8'}));
 const file=path.basename(archive);await copyFile(archive,path.join(output,file));packages.push({name:metadata.name,version:metadata.version,file,bytes:bytes.length,sha256:sha(bytes)});
}
const fixtures=[];
for(const file of ['truehd-stereo.mkv']){const source=path.join('build/provider-lossless-audio',file),bytes=await readFile(source);await copyFile(source,path.join(output,file));fixtures.push({file,bytes:bytes.length,sha256:sha(bytes)});}
const inventory={schema:1,packages,fixtures,exampleSHA256:sha(await readFile('fixtures/example.mp4'))};
const bytes=Buffer.from(JSON.stringify(inventory,null,2)+'\n');await writeFile(path.join(output,'bundle-ci-inventory.json'),bytes,{flag:'wx'});
console.log(JSON.stringify({directory:output,inventorySHA256:sha(bytes),packages:packages.length,publication:'not performed'}));

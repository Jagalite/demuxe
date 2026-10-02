// SPDX-License-Identifier: Apache-2.0
// The optional vendor package retains pinned upstream bytes, without compiling core.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyShakaAssets} from './copy-shaka-assets.mjs';
if(process.argv[2]!=='shaka')throw Error('Expected Shaka provider target');
const {pin}=await verifyShakaAssets();
for(const [name,fact]of Object.entries(pin.files)){const bytes=await readFile(name);if(bytes.length!==fact.bytes||createHash('sha256').update(bytes).digest('hex')!==fact.sha256)throw Error('Shaka deployed asset differs from pin: '+name);}
process.stdout.write('{}');

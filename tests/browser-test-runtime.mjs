// SPDX-License-Identifier: Apache-2.0
// Linux media qualification retains its pinned WebKit port independently of Apple WebKit.
import * as current from 'playwright';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const currentVersion=createRequire(import.meta.url)('playwright/package.json').version;
let selectedWebKit=current.webkit,webkitVersion=currentVersion;
if(process.env.DEMUXE_WEBKIT_TEST_MODULE){
 if(process.platform!=='linux')throw Error('The alternate WebKit test runtime is Linux-only');
 const url=pathToFileURL(process.env.DEMUXE_WEBKIT_TEST_MODULE);
 const metadata=JSON.parse(await readFile(new URL('./package.json',url),'utf8'));
 if(metadata.name!=='playwright'||metadata.version!=='1.58.2')throw Error('Linux WebKit qualification requires Playwright 1.58.2');
 selectedWebKit=(await import(url.href)).webkit;webkitVersion=metadata.version;
}
export const chromium=current.chromium,firefox=current.firefox,webkit=selectedWebKit;
export const testBrowserRuntime=Object.freeze({defaultPackageVersion:currentVersion,webkitPackageVersion:webkitVersion});

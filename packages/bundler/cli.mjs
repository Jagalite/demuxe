#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import {readFile} from 'node:fs/promises';
import {buildDemuxe} from './index.mjs';
const args=process.argv.slice(2);
if(args.length!==1){console.error('Usage: demuxe-bundle <config.json>');process.exitCode=1;}
else try{const result=await buildDemuxe(JSON.parse(await readFile(args[0])));console.log(JSON.stringify(result,null,2));}catch(error){console.error('demuxe-bundle: '+error.message);process.exitCode=1;}

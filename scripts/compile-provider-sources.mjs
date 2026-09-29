// SPDX-License-Identifier: Apache-2.0
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),config=JSON.parse(fs.readFileSync('licensing/provider-packages.json','utf8'));
const selected=new Set(config.profiles[process.argv[2]].generated);
const raw=ts.readConfigFile('tsconfig.json',ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(raw.config,ts.sys,root);
const program=ts.createProgram(parsed.fileNames,parsed.options),errors=ts.getPreEmitDiagnostics(program);
if(errors.length)throw Error(ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>root,getCanonicalFileName:s=>s,getNewLine:()=> '\n'}));
const outputs={};program.emit(undefined,(file,data,_bom,_err,sources)=>{const name=path.relative(root,file);if(selected.has(name))outputs[name]={data,inputs:sources.map(s=>path.relative(root,s.fileName))};});
if(Object.keys(outputs).length!==selected.size)throw Error('Missing provider compiler output');
process.stdout.write(JSON.stringify(outputs));

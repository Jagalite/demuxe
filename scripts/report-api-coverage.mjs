// SPDX-License-Identifier: Apache-2.0
import ts from 'typescript';
import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {surfaces,contracts} from '../tests/api-stability/suites.mjs';
import {publicSurface} from '../tests/api-stability/surface.mjs';
import {behaviorGroups,recentLiveEvidence} from '../tests/api-stability/behavior-map.mjs';
import {validLiveReceipt} from '../tests/api-stability/live-check-helpers.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function buildCoverage(){
 const structural=publicSurface();
 // TypeScript appends process-local symbol IDs; retain the well-known name only.
 for(const exports of Object.values(structural))for(const [name,members]of Object.entries(exports))exports[name]=members.map(member=>member.replace(/^__@(.+?)@\d+$/, '[Symbol.$1]')).sort();
 const program=ts.createProgram(Object.values(surfaces).map(s=>s.source),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,skipLibCheck:true,noEmit:true}),checker=program.getTypeChecker();
 const inventory=[];
 for(const [entry,{source}]of Object.entries(surfaces)){
  for(const exported of checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(source)))){
   const symbol=exported.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(exported):exported;
   if(!(symbol.flags&ts.SymbolFlags.Value))continue;
   const key=entry+'#'+exported.name,members=structural[entry][exported.name];
   for(const member of members.length?members:[null])inventory.push({key:key+(member===null?'':'.'+member),entry,export:exported.name,member});
   if(symbol.declarations?.some(ts.isClassDeclaration))inventory.push({key:key+'.constructor',entry,export:exported.name,member:'constructor'});
  }
 }
 const known=new Set(inventory.map(row=>row.key)),byMember=new Map(),unitFiles=new Set(Object.values(contracts).flat().map(name=>'tests/'+name+'.mjs'));
 for(const group of behaviorGroups){
  for(const api of group.apis){if(!known.has(api))throw Error('Unknown mapped API '+api);if(byMember.has(api))throw Error('Duplicate mapped API '+api);byMember.set(api,group.id);}
  for(const file of [...group.unit,...group.browser])await access(file);
  for(const file of group.unit)if(!unitFiles.has(file))throw Error('Unit reference is outside the maintained gate: '+file);
 }
 const receipts=[];
 for(const file of recentLiveEvidence.receipts){
  let data;try{data=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT'){receipts.push({file,status:'missing'});continue;}throw error;}
  if(!validLiveReceipt(data)){receipts.push({file,status:data?.passed===false?'failed':'invalid-receipt'});continue;}
  let matching=true;
  for(const [path,hash]of Object.entries(data.hashes??{}))if(sha(await readFile(path))!==hash)matching=false;
  receipts.push({file,status:!data.passed?'failed':matching?'passed-recorded-inputs-match':'historical-inputs-differ',family:data.family,browser:data.browser,revision:data.revision,checks:data.checks.filter(row=>row.passed).map(row=>row.scenario)});
 }
 for(const [member,cases]of Object.entries(recentLiveEvidence.members)){
  if(!known.has(member))throw Error('Unknown live evidence API '+member);
  for(const receipt of receipts)if(receipt.status.startsWith('passed')&&!cases.every(name=>receipt.checks.includes(name)))throw Error('Missing asserted scenario in '+receipt.file);
 }
 const runtimeExports=new Set(inventory.map(row=>row.entry+'#'+row.export));
 const dataContracts=Object.entries(structural).flatMap(([entry,exports])=>Object.entries(exports).filter(([name])=>!runtimeExports.has(entry+'#'+name)).map(([name,members])=>({entry,export:name,members,status:'structural-only',gap:'Option, event, and return-value semantics are not individually audited by this inventory.'})));
 const runtime=inventory.sort((a,b)=>a.key.localeCompare(b.key)).map(row=>({...row,status:byMember.has(row.key)?'mapped-partial':'unmapped',behaviorGroup:byMember.get(row.key)??null,liveAssertions:recentLiveEvidence.members[row.key]??[],liveEvidence:recentLiveEvidence.members[row.key]?receipts:[]}));
 return {schema:1,scope:'Declared runtime exports, class members and constructors for all seven published entrypoints; structural export/member snapshot includes types. Inherited platform APIs and nested option/event/return-value semantics need separate review.',interpretation:'Mapped-partial links a member to a reviewed behavior family and relevant test implementations. It does not assert that every member or behavior in that family is directly tested. Live evidence applies only to the listed assertions and sampled input hashes; it is not complete package or release qualification.',summary:{entrypoints:Object.keys(surfaces).length,exportDeclarations:Object.values(structural).reduce((n,s)=>n+Object.keys(s).length,0),runtimeItems:runtime.length,mappedPartial:runtime.filter(r=>r.status==='mapped-partial').length,unmapped:runtime.filter(r=>r.status==='unmapped').length,withRecentLiveAssertions:runtime.filter(r=>r.liveAssertions.length).length,fullyCovered:0,structuralOnlyContracts:dataContracts.length},behaviorGroups,runtime,dataContracts,structural,unmapped:runtime.filter(r=>r.status==='unmapped').map(r=>r.key)};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=await buildCoverage(),file='docs/api-behavior-coverage.json',serialized=JSON.stringify(report,null,2)+'\n';
 if(process.argv.includes('--write'))await writeFile(file,serialized);
 else if(process.argv.includes('--check')){if(await readFile(file,'utf8')!==serialized)throw Error('Coverage report is stale; review mapping and run --write');}
 else console.log(JSON.stringify(report.summary,null,2));
}

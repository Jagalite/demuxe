// SPDX-License-Identifier: Apache-2.0
import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {surfaces} from './suites.mjs';

// Static inventory only: no emit, imports, fixture execution, or runtime loading.
export function publicSurface() {
  const program=ts.createProgram(Object.values(surfaces).map(s=>s.source), {
    target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.NodeNext,
    moduleResolution:ts.ModuleResolutionKind.NodeNext, skipLibCheck:true, noEmit:true,
  });
  const checker=program.getTypeChecker(), result={};
  for(const [entry,{source}] of Object.entries(surfaces)) {
    const module=checker.getSymbolAtLocation(program.getSourceFile(source));
    if(!module)throw Error('No module '+source);
    result[entry]={};
    for(const exported of checker.getExportsOfModule(module).sort((a,b)=>a.name.localeCompare(b.name))) {
      const symbol=exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const members=new Set();
      for(const declaration of symbol.declarations??[]) {
        if(ts.isTypeAliasDeclaration(declaration)){
          const type=checker.getDeclaredTypeOfSymbol(symbol);
          if(type.flags & (ts.TypeFlags.Object|ts.TypeFlags.Intersection))
            for(const property of checker.getPropertiesOfType(type))members.add(property.name);
        }
        if(!ts.isClassDeclaration(declaration)&&!ts.isInterfaceDeclaration(declaration))continue;
        for(const member of declaration.members) {
          if(!member.name||ts.isPrivateIdentifier(member.name))continue;
          if(member.modifiers?.some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)))continue;
          members.add((member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword)?'static ':'')+member.name.getText());
        }
      }
      result[entry][exported.name]=[...members].sort();
    }
  }
  return result;
}
export const snapshotURL=new URL('./public-surface.json',import.meta.url);
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  if(process.argv[2]!=='--write')throw Error('Use --write only after reviewing API and coverage changes');
  await writeFile(snapshotURL,JSON.stringify(publicSurface(),null,2)+'\n');
}
export async function recordedSurface(){return JSON.parse(await readFile(snapshotURL,'utf8'));}

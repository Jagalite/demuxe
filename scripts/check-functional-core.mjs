// SPDX-License-Identifier: Apache-2.0
// Static boundary guard, not a proof of referential transparency. It checks
// source imports, ambient references and visible writes. Arbitrary aliasing,
// callbacks, getters/proxies and mutation hidden behind a helper still require
// review and reducer immutability/replay tests. This tool never executes sources.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const deterministicGlobals=new Set(['Object','Array','Math','Number','String','Boolean','BigInt','JSON','Map','Set','Error','TypeError','RangeError','RegExp','ArrayBuffer','DataView','Uint8Array','Uint8ClampedArray','Uint16Array','Uint32Array','Int8Array','Int16Array','Int32Array','Float32Array','Float64Array','BigInt64Array','BigUint64Array','Infinity','NaN','undefined','parseInt','parseFloat','isFinite','isNaN','encodeURIComponent','decodeURIComponent']);
const forbiddenTypes=new Set(['Promise','PromiseLike','AbortController','AbortSignal','Date','WeakMap','WeakSet','WeakRef','FinalizationRegistry','SharedArrayBuffer','Atomics']);
const hostNamespaces=new Set(['globalThis','window','self','global','document','navigator','performance','crypto','process']);
const mutators=new Set(['set','add','delete','clear','push','pop','shift','unshift','splice','sort','reverse','copyWithin','fill','setPrototypeOf','defineProperty','defineProperties']);
const real=file=>fs.existsSync(file)?fs.realpathSync(file):path.resolve(file);
const inside=(file,directory)=>file===directory||file.startsWith(directory+path.sep);
const isFunction=node=>ts.isFunctionLike(node);
const unparen=node=>{
  while(node&&(ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isNonNullExpression(node)||ts.isSatisfiesExpression(node)))node=node.expression;
  return node;
};

/** Return diagnostics without emitting, importing or executing project code. */
export function checkFunctionalCore({rootDir=path.resolve(fileURLToPath(new URL('..',import.meta.url))),pureDirectory='src/internal/machine',allowedTypeFiles=['src/types.ts']}={}) {
  const root=real(rootDir),pure=real(path.resolve(root,pureDirectory));
  const shared=new Set(allowedTypeFiles.map(file=>real(path.resolve(root,file))));
  const diagnostics=[],seenDiagnostics=new Set(),roots=[];
  function diagnostic(node,code,message,file) {
    const source=node?.getSourceFile(),name=file??source?.fileName??pure;
    const point=source&&node?source.getLineAndCharacterOfPosition(node.getStart(source)):{line:0,character:0};
    const entry={file:path.relative(root,name).split(path.sep).join('/'),line:point.line+1,column:point.character+1,code,message};
    const key=JSON.stringify(entry);if(!seenDiagnostics.has(key)){seenDiagnostics.add(key);diagnostics.push(entry);}
  }
  function collect(directory) {
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const file=path.join(directory,entry.name);
      if(entry.isSymbolicLink()){diagnostic(undefined,'source-link','Pure source trees must not contain symlinks',file);continue;}
      if(entry.isDirectory())collect(file);else if(/\.tsx?$/.test(entry.name))roots.push(file);
    }
  }
  if(!fs.existsSync(pure)){diagnostic(undefined,'missing-core','Pure source directory does not exist');return diagnostics;}
  collect(pure);
  if(!roots.length){diagnostic(undefined,'empty-core','Pure source directory contains no TypeScript files');return diagnostics;}
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,noEmit:true,strict:true,skipLibCheck:true};
  const program=ts.createProgram(roots,options),checker=program.getTypeChecker();
  const sources=program.getSourceFiles().filter(source=>inside(real(source.fileName),pure));
  const symbolAt=node=>ts.isIdentifier(node)&&ts.isShorthandPropertyAssignment(node.parent)&&node.parent.name===node
    ?checker.getShorthandAssignmentValueSymbol(node.parent):checker.getSymbolAtLocation(node);
  const localDeclaration=symbol=>symbol?.declarations?.find(node=>inside(real(node.getSourceFile().fileName),pure));
  const moduleDeclaration=node=>{
    for(let parent=node.parent;parent&&!ts.isSourceFile(parent);parent=parent.parent)if(isFunction(parent)||ts.isClassLike(parent))return false;
    return true;
  };
  const isTypePosition=node=>{
    for(let current=node.parent;current;current=current.parent){
      if(ts.isTypeNode(current))return true;
      if(ts.isExpressionStatement(current)||ts.isStatement(current)||isFunction(current))return false;
    }
    return false;
  };
  const isReference=node=>{
    const parent=node.parent;
    if((ts.isPropertyAccessExpression(parent)&&parent.name===node)||(ts.isQualifiedName(parent)&&parent.right===node))return false;
    if((ts.isPropertyAssignment(parent)||ts.isMethodDeclaration(parent)||ts.isPropertyDeclaration(parent)||ts.isPropertySignature(parent)||ts.isMethodSignature(parent))&&parent.name===node&&!ts.isComputedPropertyName(parent.name))return false;
    if((ts.isVariableDeclaration(parent)||ts.isParameter(parent)||ts.isFunctionDeclaration(parent)||ts.isFunctionExpression(parent)||ts.isClassDeclaration(parent)||ts.isInterfaceDeclaration(parent)||ts.isTypeAliasDeclaration(parent)||ts.isTypeParameterDeclaration(parent)||ts.isEnumDeclaration(parent)||ts.isEnumMember(parent)||ts.isNamedTupleMember(parent))&&parent.name===node)return false;
    if(ts.isImportSpecifier(parent)||ts.isImportClause(parent)||ts.isNamespaceImport(parent)||ts.isExportSpecifier(parent))return false;
    if(ts.isBindingElement(parent)&&(parent.name===node||parent.propertyName===node))return false;
    if(ts.isLabeledStatement(parent)||ts.isBreakStatement(parent)||ts.isContinueStatement(parent))return false;
    return true;
  };
  function resolveImport(node,specifier,typeOnly) {
    const source=node.getSourceFile();
    const target=ts.resolveModuleName(specifier,source.fileName,options,ts.sys).resolvedModule;
    if(!target){diagnostic(node,'unresolved-import',`Cannot resolve source import ${specifier}`);return;}
    const file=real(target.resolvedFileName);
    if(!inside(file,pure)&&!(typeOnly&&shared.has(file)))diagnostic(node,'import-boundary',`${typeOnly?'Type':'Runtime'} import leaves the pure core: ${specifier}`);
  }
  function ambient(node) {
    const symbol=symbolAt(node);
    if(localDeclaration(symbol))return false;
    // The only external values permitted are explicitly listed deterministic
    // ECMAScript globals. Unknown names fail closed, including require/process.
    if(symbol?.declarations?.some(declaration=>shared.has(real(declaration.getSourceFile().fileName))))return false;
    return true;
  }
  function origin(expression,seen=new Set()) {
    expression=unparen(expression);if(!expression)return;
    if(ts.isPropertyAccessExpression(expression))return origin(expression.expression,seen);
    if(ts.isElementAccessExpression(expression))return origin(expression.expression,seen);
    if(!ts.isIdentifier(expression))return;
    if(ambient(expression))return {kind:'ambient',name:expression.text};
    const symbol=symbolAt(expression),declaration=localDeclaration(symbol);
    if(!declaration||seen.has(declaration))return;seen.add(declaration);
    if(ts.isParameter(declaration))return {kind:'input',name:expression.text};
    if(moduleDeclaration(declaration))return {kind:'module',name:expression.text};
    if(ts.isVariableDeclaration(declaration))return origin(declaration.initializer,seen);
    if(ts.isBindingElement(declaration)){
      let parent=declaration.parent;while(parent&&!ts.isVariableDeclaration(parent)&&!ts.isParameter(parent))parent=parent.parent;
      return parent&&ts.isVariableDeclaration(parent)?origin(parent.initializer,seen):{kind:'input',name:expression.text};
    }
  }
  function builtin(expression,seen=new Set()) {
    expression=unparen(expression);if(!expression||!ts.isIdentifier(expression))return;
    if(ambient(expression))return expression.text;
    const declaration=localDeclaration(symbolAt(expression));
    if(!declaration||seen.has(declaration))return;seen.add(declaration);
    if(ts.isVariableDeclaration(declaration))return builtin(declaration.initializer,seen);
  }
  function write(node,target,mutatesObject=false) {
    target=unparen(target);
    if(ts.isIdentifier(target)&&!mutatesObject){
      const declaration=localDeclaration(symbolAt(target));
      // Rebinding a parameter or local alias changes this invocation only.
      if(declaration&&!moduleDeclaration(declaration))return;
    }
    const owner=origin(target);
    if(owner&&['ambient','module','input'].includes(owner.kind))diagnostic(node,'persistent-write',`Mutation of ${owner.kind} state (${owner.name}) is outside the pure boundary`);
  }
  function externalType(node,visited=new Set()) {
    let symbol=symbolAt(node);
    if(symbol?.flags&ts.SymbolFlags.Alias)symbol=checker.getAliasedSymbol(symbol);
    if(!symbol||visited.has(symbol))return;visited.add(symbol);
    for(const declaration of symbol.declarations??[]){
      if(!shared.has(real(declaration.getSourceFile().fileName)))continue;
      function visitType(child){
        if(ts.isFunctionTypeNode(child)||ts.isConstructorTypeNode(child)||ts.isMethodSignature(child)||ts.isCallSignatureDeclaration(child))diagnostic(node,'non-data-type',`Shared type ${symbol.name} contains callable state`);
        if(ts.isTypeReferenceNode(child)||ts.isExpressionWithTypeArguments(child)){
          const name=ts.isTypeReferenceNode(child)?child.typeName:child.expression;
          let typeSymbol=symbolAt(name);
          if(typeSymbol?.flags&ts.SymbolFlags.Alias)typeSymbol=checker.getAliasedSymbol(typeSymbol);
          const declarations=typeSymbol?.declarations??[];
          if(forbiddenTypes.has(name.getText())||declarations.some(item=>/lib\.dom\./.test(item.getSourceFile().fileName)&&ts.isInterfaceDeclaration(item)))diagnostic(node,'non-data-type',`Shared type ${symbol.name} contains a host or asynchronous type: ${name.getText()}`);
          if(declarations.some(item=>!shared.has(real(item.getSourceFile().fileName))&&!program.isSourceFileDefaultLibrary(item.getSourceFile())))diagnostic(node,'type-boundary',`Shared type ${symbol.name} references another source module`);
          externalType(name,visited);
        }
        if(ts.isImportTypeNode(child))diagnostic(node,'type-boundary',`Shared type ${symbol.name} contains a transitive import type`);
        ts.forEachChild(child,visitType);
      }
      visitType(declaration);
    }
  }
  for(const source of sources){
    for(const parse of source.parseDiagnostics??[])diagnostic(source,'parse-error',ts.flattenDiagnosticMessageText(parse.messageText,' '));
    if(source.referencedFiles.length||source.typeReferenceDirectives.length)diagnostic(source,'reference-boundary','Use explicit checked imports instead of ambient reference directives');
    function visit(node) {
      if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){
        if(node.moduleSpecifier&&ts.isStringLiteralLike(node.moduleSpecifier)){
          const clause=ts.isImportDeclaration(node)?node.importClause:undefined;
          const bindings=clause?.namedBindings;
          const elements=bindings&&ts.isNamedImports(bindings)?bindings.elements:ts.isExportDeclaration(node)&&node.exportClause&&ts.isNamedExports(node.exportClause)?node.exportClause.elements:undefined;
          const typeOnly=!!(ts.isImportDeclaration(node)?clause?.isTypeOnly:node.isTypeOnly)||!!(elements?.length&&elements.every(item=>item.isTypeOnly)&&!clause?.name);
          resolveImport(node,node.moduleSpecifier.text,typeOnly);
          if(typeOnly){for(const element of elements??[])externalType(element.name);if(bindings&&ts.isNamespaceImport(bindings))diagnostic(node,'namespace-type','Import individual data types instead of a type namespace');}
        }
      }
      if(ts.isImportEqualsDeclaration(node))diagnostic(node,'import-boundary','Import-equals and require are not supported in the pure core');
      if(ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument)&&ts.isStringLiteralLike(node.argument.literal)){
        resolveImport(node,node.argument.literal.text,true);if(node.qualifier)externalType(node.qualifier);
      }
      if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)diagnostic(node,'dynamic-import','Dynamic import is an effect');
      if(ts.isAwaitExpression(node)||node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.AsyncKeyword))diagnostic(node,'async','The pure core must be synchronous');
      if(node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.DeclareKeyword))diagnostic(node,'ambient-declaration','Ambient declarations belong outside the pure core');
      if(ts.isClassDeclaration(node)||ts.isClassExpression(node))diagnostic(node,'class-state','Keep class instances and their state outside the pure core');
      if(ts.isVariableDeclarationList(node)&&moduleDeclaration(node)&&!(node.flags&ts.NodeFlags.Const))diagnostic(node,'module-state','Module variables must be const');
      if(ts.isIdentifier(node)&&isReference(node)){
        if(isTypePosition(node)){
          const symbol=symbolAt(node);
          if(ambient(node)&&(forbiddenTypes.has(node.text)||hostNamespaces.has(node.text)||symbol?.declarations?.some(item=>/lib\.dom\./.test(item.getSourceFile().fileName)&&ts.isInterfaceDeclaration(item))))diagnostic(node,'host-type',`Host or asynchronous type is outside the pure core: ${node.text}`);
          externalType(node);
        }else if(ambient(node)&&!deterministicGlobals.has(node.text))diagnostic(node,'ambient','Ambient value is outside the pure core: '+node.text);
      }
      if(ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node)){
        const object=builtin(node.expression),key=ts.isPropertyAccessExpression(node)?node.name.text:node.argumentExpression&&ts.isStringLiteralLike(node.argumentExpression)?node.argumentExpression.text:undefined;
        if(object==='Math'&&(key===undefined||key==='random'))diagnostic(node,'nondeterminism','Math.random and computed Math members are outside the pure core');
        if(key==='constructor'||key==='__proto__')diagnostic(node,'reflection','Constructor/prototype escape is outside the pure core');
      }
      if(ts.isVariableDeclaration(node)&&ts.isObjectBindingPattern(node.name)&&builtin(node.initializer)==='Math'){
        if(node.name.elements.some(element=>{
          if(element.dotDotDotToken)return true;
          const name=element.propertyName??element.name;
          return ts.isComputedPropertyName(name)||name.getText().replace(/^['"]|['"]$/g,'')==='random';
        }))diagnostic(node,'nondeterminism','Destructuring Math.random or computed Math members is outside the pure core');
      }
      if(ts.isBinaryExpression(node)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment)write(node,node.left);
      if((ts.isPrefixUnaryExpression(node)||ts.isPostfixUnaryExpression(node))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(node.operator))write(node,node.operand);
      if(ts.isDeleteExpression(node))write(node,node.expression);
      if(ts.isCallExpression(node)){
        const callee=unparen(node.expression);
        if(ts.isPropertyAccessExpression(callee)||ts.isElementAccessExpression(callee)){
          const key=ts.isPropertyAccessExpression(callee)?callee.name.text:callee.argumentExpression&&ts.isStringLiteralLike(callee.argumentExpression)?callee.argumentExpression.text:undefined;
          if(mutators.has(key)&&builtin(callee.expression)!=='Object')write(node,callee.expression,true);
          // Integrity operations mutate their target too: a reducer may freeze
          // its fresh output, but must not freeze a caller-owned object graph.
          if(builtin(callee.expression)==='Object'&&['assign','defineProperty','defineProperties','setPrototypeOf','freeze','seal','preventExtensions'].includes(key)&&node.arguments[0])write(node,node.arguments[0],true);
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(source);
  }
  return diagnostics.sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line||a.column-b.column||a.code.localeCompare(b.code));
}

if(process.argv[1]&&real(process.argv[1])===real(fileURLToPath(import.meta.url))){
  const diagnostics=checkFunctionalCore();
  for(const item of diagnostics)console.error(`${item.file}:${item.line}:${item.column} [${item.code}] ${item.message}`);
  if(diagnostics.length)process.exitCode=1;else console.log('Functional core source boundary passed (static checks only).');
}

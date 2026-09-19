// SPDX-License-Identifier: Apache-2.0
// Parse imports rather than matching comment text or module names with a regex.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const policy = JSON.parse(fs.readFileSync(path.join(root, 'licensing/boundaries.json'), 'utf8'));
const allowed = new Set(policy.coreSources);
for (const file of policy.coreSources) {
  if (file.startsWith('src/') && file.endsWith('.ts')) {
    allowed.add(file.replace(/^src\//, 'web/generated/').replace(/\.ts$/, '.js'));
    allowed.add(file.replace(/^src\//, 'web/generated/').replace(/\.ts$/, '.d.ts'));
  }
}
function reference(file, expression) {
  if (!expression || !ts.isStringLiteralLike(expression)) throw Error(`${file}: computed module/asset loading is forbidden in core`);
  const value = expression.text;
  if (!value.startsWith('.')) throw Error(`${file}: external module/asset ${value} is outside core`);
  let target = path.posix.normalize(path.posix.join(path.posix.dirname(file), value));
  if (file.startsWith('src/') && target.endsWith('.js')) target = target.slice(0, -3) + '.ts';
  if (!allowed.has(target)) throw Error(`${file}: ${value} crosses the reusable license boundary`);
}
for (const file of allowed) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw Error(`Missing core source/output: ${file}; run npm run build`);
  const source = ts.createSourceFile(file, fs.readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) reference(file, node.moduleSpecifier);
    if (ts.isImportTypeNode(node)) reference(file, node.argument.literal);
    if (ts.isImportEqualsDeclaration(node)) throw Error(`${file}: import aliases are forbidden in core`);
    if (ts.isCallExpression(node)) {
      const call = node.expression.getText(source);
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword || /(?:^|\.)require$/.test(call)) reference(file, node.arguments[0]);
      if (/\b(?:importScripts|eval|Function)$/.test(call)) throw Error(`${file}: dynamic code loading is forbidden in core`);
      if (/^(?:WebAssembly\.|navigator\.serviceWorker\.register)/.test(call)) throw Error(`${file}: engine loading is forbidden in core`);
    }
    if (ts.isNewExpression(node)) {
      const name = node.expression.getText(source);
      if (['Worker', 'SharedWorker', 'Function'].includes(name)) throw Error(`${file}: worker/code loading is outside core`);
      if (name === 'URL' && node.arguments?.[1]?.getText(source) === 'import.meta.url') reference(file, node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'packages/core/package.json'), 'utf8'));
function exportsCheck(value) {
  if (typeof value === 'object') return Object.values(value).forEach(exportsCheck);
  if (value !== './package.json' && !allowed.has(value.replace(/^\.\//, ''))) throw Error(`Core export outside boundary: ${value}`);
}
exportsCheck(metadata.exports);
console.log(`Core dependency boundary verified (${allowed.size} source/output files)`);

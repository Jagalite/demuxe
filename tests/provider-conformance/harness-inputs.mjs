// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile, lstat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire, isBuiltin, findPackageJSON} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import {sha} from './package.mjs';

const exec = promisify(execFile);

// Run resolution in a fresh Node process with the same conditions as the test
// worker. This flag enables import.meta.resolve's explicit parent URL; no
// candidate or harness code is evaluated during discovery.
export async function collectHarnessInputs(module) {
  const {stdout} = await exec(process.execPath, ['--experimental-import-meta-resolve',
    fileURLToPath(import.meta.url), path.resolve(module)], {maxBuffer: 16 * 1024 * 1024});
  return JSON.parse(stdout);
}

async function collectNativeInputs(entry) {
  const inputs = {}, visited = new Set();
  const scan = async filename => {
    if (visited.has(filename)) return;
    visited.add(filename);
    const bytes = await readFile(filename);
    inputs[filename] = sha(bytes);
    const dependencies = [];
    if (/\.[cm]?[jt]sx?$/.test(filename)) {
      const ast = ts.createSourceFile(filename, bytes.toString(), ts.ScriptTarget.Latest, true);
      const requireNames = new Map([['require', pathToFileURL(filename).href]]), createRequireNames = new Set(['createRequire']);
      for (const node of ast.statements) {
        if (ts.isImportDeclaration(node) && ['node:module', 'module'].includes(node.moduleSpecifier.text)) {
          const bindings = node.importClause?.namedBindings;
          if (bindings && ts.isNamedImports(bindings)) for (const imported of bindings.elements) {
            if ((imported.propertyName ?? imported.name).text === 'createRequire') createRequireNames.add(imported.name.text);
          }
        }
      }
      const findRequire = node => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
          && ts.isCallExpression(node.initializer) && (
            ts.isIdentifier(node.initializer.expression) && createRequireNames.has(node.initializer.expression.text)
            || ts.isPropertyAccessExpression(node.initializer.expression) && node.initializer.expression.name.text === 'createRequire')) {
          const argument = node.initializer.arguments[0];
          let parent;
          if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
            // Ask Node to validate the literal base, including file URLs.
            createRequire(argument.text); parent = argument.text.startsWith('file:') ? argument.text : pathToFileURL(argument.text).href;
          } else if (argument && (ts.isIdentifier(argument) && argument.text === '__filename'
            || ts.isPropertyAccessExpression(argument) && argument.name.text === 'url'
              && ts.isMetaProperty(argument.expression) && argument.expression.keywordToken === ts.SyntaxKind.ImportKeyword)) parent = pathToFileURL(filename).href;
          assert.ok(parent, 'Computed harness require base cannot be recorded: ' + filename);
          requireNames.set(node.name.text, parent);
        }
        ts.forEachChild(node, findRequire);
      };
      findRequire(ast);
      // CommonJS helpers often keep a local alias for require. Propagate
      // literal aliases before walking calls so their descendants are retained.
      let aliasesChanged;
      do {
        aliasesChanged = false;
        const findAliases = node => {
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
            && ts.isIdentifier(node.initializer) && requireNames.has(node.initializer.text)
            && !requireNames.has(node.name.text)) {
            requireNames.set(node.name.text, requireNames.get(node.initializer.text)); aliasesChanged = true;
          }
          ts.forEachChild(node, findAliases);
        };
        findAliases(ast);
      } while (aliasesChanged);
      const add = (specifier, kind, parent) => {
        assert.ok(specifier && (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier)),
          'Computed harness import cannot be recorded: ' + filename);
        dependencies.push({specifier: specifier.text, kind, parent});
      };
      const visit = node => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) add(node.moduleSpecifier, 'import');
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0], 'import');
          else if (ts.isIdentifier(expression) && requireNames.has(expression.text)
            || ts.isPropertyAccessExpression(expression) && (
              expression.name.text === 'resolve' && ts.isIdentifier(expression.expression) && requireNames.has(expression.expression.text)
              || expression.name.text === 'require' && ts.isIdentifier(expression.expression) && expression.expression.text === 'module')) {
            const name = ts.isIdentifier(expression) ? expression.text
              : expression.name.text === 'resolve' ? expression.expression.text : 'require';
            add(node.arguments[0], 'require', requireNames.get(name));
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
    }
    // Package metadata controls native resolution and module format.
    for (let folder = path.dirname(filename); ; folder = path.dirname(folder)) {
      const metadata = path.join(folder, 'package.json');
      try {
        if ((await lstat(metadata)).isFile()) inputs[metadata] = sha(await readFile(metadata));
      } catch (error) {if (error.code !== 'ENOENT') throw error;}
      if (path.dirname(folder) === folder) break;
    }
    const parent = pathToFileURL(filename).href;
    for (const {specifier, kind, parent: requireParent} of dependencies) {
      if (isBuiltin(specifier)) continue;
      const base = requireParent ?? parent;
      // A legacy package's main may point outside its own directory, so its
      // resolver metadata is not necessarily an ancestor of the resolved file.
      const metadata = findPackageJSON(specifier, base);
      if (metadata) inputs[metadata] = sha(await readFile(metadata));
      const resolved = kind === 'require' ? pathToFileURL(createRequire(base).resolve(specifier)).href
        : import.meta.resolve(specifier, base);
      assert.ok(resolved.startsWith('file:'), 'Harness import cannot be recorded: ' + specifier);
      await scan(fileURLToPath(resolved));
    }
  };
  await scan(entry);
  return inputs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(JSON.stringify(await collectNativeInputs(path.resolve(process.argv[2]))));
}

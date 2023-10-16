import child from 'child_process';
import fs from 'fs';
import path from 'path';

import acorn from 'acorn';
import acornJsx from 'acorn-jsx';

import generate from '@babel/generator';

import { request } from 'undici';

fs.rmdirSync(path.join(__dirname, 'src'), { recursive: true });

process.stdout.write('Cloning repository...\n');

fs.mkdirSync(path.join(__dirname, 'src'));

child.execSync('git clone https://github.com/XoticLLC/Blacket src');

process.stdout.clearLine();
process.stdout.write('\rCloning repository... Done!\n');

process.stdout.write('Installing dependencies...\n');
child.execSync('npm install', { cwd: path.join(__dirname, 'src') });
process.stdout.clearLine();
process.stdout.write('\rInstalling dependencies... Done!\n');

process.stdout.write('Parsing files...\n');

let files = [];

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
    
        if (stat.isDirectory()) {
            traverseDir(filePath);
        } else if (stat.isFile()) {
            files.push(filePath);
        }
    }
}

traverseDir(path.join(__dirname, 'src'));

let asts = [];

const jsxParse = acorn.Parser.extend(acornJsx({
    allowNamespacedObjects: true,
}));

for (const file of files) {
    asts.push({
        file: file,
        ast: jsxParse.parse(fs.readFileSync(file, 'utf8'), {
            ecmaVersion: 2020,
            sourceType: 'module',
        }),
    });
}


process.stdout.clearLine();

process.stdout.write('\rParsing files... Done!\n');

process.stdout.write('Extracting statements...\n');

let parsedDefaults = [];
let parsedEverything = [];

for (const ast of asts) {
    let eleme = {
        file: ast.file,
        element: null,
    };
    const defaultExport = ast.ast.body.find((node) => node.type === 'ExportDefaultDeclaration');

    if (defaultExport) {
        eleme.element = defaultExport;
    } else {
        continue;
    }

    parsedDefaults.push(eleme);
}

for (const ast of asts) {
    let eleme = {
        file: ast.file,
        everything: null,
    };

    eleme.everything = ast.ast;

    parsedEverything.push(eleme);
}

process.stdout.clearLine();
process.stdout.write('\rExtracting statements... Done!\n');

process.stdout.write('Patching: Plugins ' + process.argv.slice(2).join(', ') + '\n');

const repo = await request("https://raw.githubusercontent.com/probablyacai/bpeepa/main/REPOSITORIES.json");
const repos = await repo.json();

const plugins = process.argv.slice(2);
let all = [];

for (const repox of repos) {
    process.stdout.clearLine();
    process.stdout.write('\rLoading repo ' + repox + '\n');

    const repo = await request("https://raw.githubusercontent.com/" + repox + "/main/PLUGINS.json");
    const plugins = await repo.json();

    for (const plugin of plugins) {
        all.push({
            author: repox.split('/')[0],
            name: plugin.name,
            patches: (await request("https://raw.githubusercontent.com/" + repox + "/main/" + plugin.name + ".js")).json(),
        });
    }

    process.stdout.clearLine();
    process.stdout.write('\rLoading repo ' + repox + '... Done!\n');
}

process.stdout.clearLine();
process.stdout.write('\rPatching: Plugins ' + process.argv.slice(2).join(', ') + '... Done!\n');

const pluginsUsed = [];

for (const plugin of all) {
    if (plugins.includes(plugin.name)) {
        pluginsUsed.push({
            name: plugin.name,
            patches: (await import(plugin.patches)).default,
        });
    }
}

process.stdout.write('Patching: Plugins ' + process.argv.slice(2).join(', ') + '\n');

let patchedDefaults = [];
let patchedEverything = [];

for (const plugin of pluginsUsed) {
    for (const parsedDefault of parsedDefaults) {
        const patched = plugin.defaultExport(parsedDefault.element);

        if (patched) {
            patchedDefaults.push({
                file: parsedDefault.file,
                element: patched,
            });
        }
    }

    for (const parsedElement of parsedEverything) {
        const patched = plugin.everything(parsedElement.everything);

        if (patched) {
            patchedEverything.push({
                file: parsedElement.file,
                everything: patched,
            });
        }
    }
}


process.stdout.clearLine();
process.stdout.write('\rPatching: Plugins ' + process.argv.slice(2).join(', ') + '... Done!\n');

process.stdout.write('Generating files...\n');

let fullFiles = [];
let defaultFiles = [];

for (const patchedThing of patchedEverything) {
    const generated = generate(patchedThing.everything);

    fullFiles.push({
        file: patchedThing.file,
        content: generated.code,
    });
}

for (const patchedThing of patchedDefaults) {
    const generated = generate(patchedThing.element);

    const file = fullFiles.find((file) => file.file === patchedThing.file);

    const parsed = jsxParse.parse(file.content, {
        ecmaVersion: 2020,
        sourceType: 'module',
    });

    const defaultElement = parsed.body.find((node) => node.type === 'ExportDefaultDeclaration');

    defaultElement.declaration = patchedThing.element.declaration;
}

for (const file of fullFiles) {
    const parsed = jsxParse.parse(file.content, {
        ecmaVersion: 2020,
        sourceType: 'module',
    });

    const defaultElement = parsed.body.find((node) => node.type === 'ExportDefaultDeclaration');

    defaultFiles.push({
        file: file.file,
        content: generate(defaultElement).code,
    });
}

process.stdout.clearLine();
process.stdout.write('\rGenerating files... Done!\n');

process.stdout.write('Writing files...\n');

for (const file of fullFiles) {
    fs.writeFileSync(file.file, file.content);
}

process.stdout.clearLine();
process.stdout.write('\rWriting files... Done!\n');

process.stdout.write('Cleaning up...\n');

fs.mkdirSync(path.join(__dirname, 'dist'));

for (const file of files) {
    fs.copyFileSync(file, path.join(__dirname, 'dist', path.basename(file)));
}

fs.rmdirSync(path.join(__dirname, 'src'), { recursive: true });

fs.mkdirSync(path.join(__dirname, 'src'));

process.stdout.clearLine();
process.stdout.write('\rCleaning up... Done!\n');

process.stdout.write('Done!\n');
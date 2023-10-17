#!/usr/bin/env node

import child from 'child_process';
import fs from 'fs';
import path from 'path';

import { default as beanstewarter } from '@babel/parser';

import { default as beanstewart } from '@babel/generator';
import css from 'css';

import { request } from 'undici';

import { parseArgs } from "node:util";
import Module from "node:module";

import { minify as terser } from 'terser';

import postcss from 'postcss';
import safe from 'postcss-safe-parser';
import min from 'postcss-minify';

const generate = beanstewart.default;
const acorn = beanstewarter;

const args = parseArgs({
    options: {
        plugins: {
            type: 'string',
            short: 'p',
        },
        styles: {
            type: 'string',
            short: 's',
        },
        minify: {
            type: 'boolean',
            short: 'm',
        },
    }
}).values;

const __dirname = path.dirname(new URL(import.meta.url).pathname).slice(1).replaceAll('\\', '/');

let worked1 = false;
let ind1 = 0;
while (!worked1) {
    try {
        fs.rmSync(path.join(__dirname, 'src'), { recursive: true });
        worked1 = true;
    } catch (e) {
        if (fs.existsSync(path.join(__dirname, 'src'))) {
            ind1++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            process.stdout.clearLine();
            process.stdout.write('\rDeleting src folder... Attempt ' + ind1 + ": " + e.message + '\n');
        } else {
            worked1 = true;
        }
    }
}
try {
    fs.rmSync(path.join(__dirname, 'dist'), { recursive: true });
} catch (e) {
    if (fs.existsSync(path.join(__dirname, 'dist'))) {
        process.stdout.write('Could not remove dist folder.\n');
    }
}

process.stdout.write('Cloning repository...');

try {
    fs.mkdirSync(path.join(__dirname, 'src'));
} catch (e) {}

let ind = 0;
let worked = false;
while (!worked) {
    try {
        child.execSync('git clone https://github.com/XoticLLC/Blacket src', {
            cwd: __dirname,
            stdio: 'ignore'
        });
        worked = true;
    } catch (e) {
        ind++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        process.stdout.clearLine();
        process.stdout.write('\rCloning repository... Attempt ' + ind);
    }
}


process.stdout.clearLine();
process.stdout.write('\rCloning repository... Done!\n');

process.stdout.write('Installing dependencies...');
child.execSync('npm install', { cwd: path.join(__dirname, 'src') });
process.stdout.clearLine();
process.stdout.write('\rInstalling dependencies... Done!\n');

process.stdout.write('Parsing files...');

let files = [];

function traverseDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else {
            if ((fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) && !fullPath.includes('node_modules')) {
                files.push(fullPath);
            }
        }
    });
}

traverseDir(path.join(__dirname, 'src'));

let asts = [];

const jsxParse = {parse: (code) => {
    return acorn.parse(code, {
        plugins: [ 'jsx' ],
        ecmaVersion: 2022,
        sourceType: 'module',
        jsx: true,
    });
}};

for (const file of files) {
    asts.push({
        file: file,
        ast: jsxParse.parse(fs.readFileSync(file, 'utf8'), {
            ecmaVersion: 2022,
            sourceType: 'module',
        }),
    });
}


process.stdout.clearLine();

process.stdout.write('\rParsing files... Done!\n');

process.stdout.write('Extracting statements...');

let parsedDefaults = [];
let parsedEverything = [];

for (const ast of asts) {
    let eleme = {
        file: ast.file,
        element: null,
    };

    const defaultExport = ast.ast.program.body.find((node) => node.type === 'ExportDefaultDeclaration');

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

process.stdout.write('Patching: Plugins ' + args.plugins.split(',').map(x => x.trim()).join(', '));

const repo = await request("https://raw.githubusercontent.com/probablyacai/bpeepa/main/REPOSITORIES.json");
const repos = await repo.body.json();

const plugins = args.plugins.split(',').map(x => x.trim());
let all = [];

let repo_cache = [];

for (const repox of repos) {
    process.stdout.clearLine();
    process.stdout.write('\rLoading repo ' + repox);

    try {
        const repo = await request("https://raw.githubusercontent.com/" + repox + "/main/PLUGINS.json");
        const plugins = await repo.body.json();
        repo_cache.push({
            repo: repox,
            plugins: plugins,
            styles: plugins.styles || []
        });

        for (const dep of plugins.deps) {
            process.stdout.clearLine();
            process.stdout.write("\rInstalling dep " + dep + " from repo " + repox + "...");
            child.execSync('npm install ' + dep, { cwd: __dirname });
            process.stdout.clearLine();
            process.stdout.write('\rInstalling dep ' + dep + ' from repo ' + repox + '... Done!');
        }

        for (const plugin of plugins.plugins) {
            try {
                process.stdout.clearLine();
                process.stdout.write("\rLoading plugin " + plugin + " from repo " + repox + "...");
                const txt = await (await request("https://raw.githubusercontent.com/" + repox + "/main/" + plugin + ".js")).body.text();
                all.push({
                    author: repox.split('/')[0],
                    name: plugin,
                    patches: txt
                });
            } catch (e) {
                process.stdout.clearLine();
                process.stdout.write('\rLoading plugin ' + plugin + ' from repo ' + repox + '... Failed! Skipping...');
            }
        }
    } catch (e) {
        process.stdout.clearLine();
        process.stdout.write('\rLoading repo ' + repox + '... Failed! Skipping...');
    }

    process.stdout.clearLine();
    process.stdout.write('\rLoading repo ' + repox + '... Done!\n');
}

process.stdout.clearLine();
process.stdout.write('\rPatching: Plugins ' + args.plugins.split(',').map(x => x.trim()).join(', ') + '... Done!\n');

const pluginsUsed = [];

if (fs.existsSync(path.join(__dirname, 'plugins')) && fs.readdirSync(path.join(__dirname, 'plugins')).length > 0) {
    process.stdout.write("Loading plugins...")
} else {
    try {
        fs.rmdirSync(path.join(__dirname, 'plugins'));
    } catch (e) { }
    try {
        fs.mkdirSync(path.join(__dirname, 'plugins'));
    } catch (e) { }
}

for (const plugin of all) {
    if (plugins.includes(plugin.name)) {
        console.log(path.join(__dirname, 'plugins', plugin.name + '.js'));
        const exists = fs.existsSync(path.join(__dirname, 'plugins', plugin.name + '.js'));
        console.log(exists ? "Plugin " + plugin.name + " already exists, skipping..." : "Plugin " + plugin.name + " does not exist, creating...");
        if (!exists) {
            fs.writeFileSync(path.join(__dirname, 'plugins', plugin.name + '.js'), plugin.patches);
        } else {
            all[all.findIndex((x) => x.name === plugin.name)].patches = fs.readFileSync(path.join(__dirname, 'plugins', plugin.name + '.js'), 'utf8');
        }
        const patched = await import('./' + path.relative(__dirname, path.join(__dirname, 'plugins', plugin.name + '.js')).replaceAll('\\', '/'));
        pluginsUsed.push({
            name: plugin.name,
            patches: patched.default
        });
    }
}

process.stdout.write('Patching: Plugins ' + args.plugins.split(',').map(x => x.trim()).join(', ') + '\n');

let patchedDefaults = [];
let patchedEverything = [];

for (const pluggy of pluginsUsed) {
    for (const parsedDefault of parsedDefaults) {
        const plugin = pluggy.patches({
            file: parsedDefault.file.replace(path.join(__dirname, 'src'), '').replaceAll('\\', '/').slice(1),
            element: parsedDefault.element
        });
        if (plugin.defaultExport) {
            const patched = plugin.defaultExport({
                file: parsedDefault.file.replace(path.join(__dirname, 'src'), '').replaceAll('\\', '/').slice(1),
                element: parsedDefault.element
            });

            if (plugin.condition && patched) {
                patchedDefaults.push({
                    file: parsedDefault.file,
                    element: patched.element,
                });
            }
        }
    }

    for (const parsedElement of parsedEverything) {
        const plugin = pluggy.patches({
            file: parsedElement.file.replace(path.join(__dirname, 'src'), '').replaceAll('\\', '/').slice(1),
            element: parsedElement.everything
        });
        let patched;
        if (plugin.everything) {
            patched = plugin.everythingExport({
                file: parsedElement.file.replace(path.join(__dirname, 'src'), '').replaceAll('\\', '/').slice(1),
                everything: parsedElement.everything,
            });
        }
        patchedEverything.push({
            file: parsedElement.file,
            everything: patched ? patched.everything : undefined || parsedElement.everything,
            rules: patched ? patched.rules : undefined || []
        });
    }
}


process.stdout.clearLine();
process.stdout.write('\rPatching: Plugins ' + args.plugins.split(',').map(x => x.trim()).join(', ') + '... Done!\n');

process.stdout.write('Generating files...\n');

let fullFiles = [];
let defaultFiles = [];

for (const patchedThing of patchedEverything) {
    const generated = generate(patchedThing.everything);

    process.stdout.clearLine();
    process.stdout.write('\rGenerated file ' + patchedThing.file);

    fullFiles.push({
        file: patchedThing.file,
        content: generated.code,
    });
}

for (const patchedThing of patchedDefaults) {
    const generated = generate(patchedThing.element);

    process.stdout.clearLine();
    process.stdout.write('\rGenerated file ' + patchedThing.file);

    const file = fullFiles.find((file) => file.file === patchedThing.file);

    const parsed = jsxParse.parse(file.content, {
        ecmaVersion: 2022,
        sourceType: 'module',
    });
    
    const defaultElement = parsed.program.body.find((node) => node.type === 'ExportDefaultDeclaration');

    defaultElement.declaration = patchedThing.element.declaration;
}

for (const file of fullFiles) {
    const parsed = jsxParse.parse(file.content, {
        ecmaVersion: 2022,
        sourceType: 'module',
    });

    const defaultElement = parsed.program.body.find((node) => node.type === 'ExportDefaultDeclaration');

    defaultFiles.push({
        file: file.file,
        content: generate(defaultElement).code,
    });
}

process.stdout.clearLine();
process.stdout.write('\rGenerating files... Done!\n');

process.stdout.write('Writing files...\n');

for (const file of fullFiles) {
    if (args.minify) {
        const minified = await terser(file.content, {
            ecma: 2022,
            module: true,
            mangle: true,
            compress: true
        });

        file.content = minified.code;
    }

    fs.writeFileSync(file.file, file.content);
}

process.stdout.clearLine();
process.stdout.write('\rWriting files... Done!\n');

process.stdout.write('Cleaning up...\n');

try {
    fs.mkdirSync(path.join(__dirname, 'dist'));
} catch (e) { }

fs.cpSync(path.join(__dirname, "src"), path.join(__dirname, "dist"), {
    recursive: true
});

process.stdout.clearLine();
process.stdout.write('\rCleaning up... Done!\n');

process.stdout.write('Done!\n');

process.stdout.write('Starting CSS parsing...\n');

const cssFiles = [];

function traverseDirCSS(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (fs.lstatSync(path.join(dir, file)).isDirectory()) {
            traverseDirCSS(path.join(dir, file));
        } else {
            if (file.endsWith('.css') && !file.includes('node_modules')) {
                cssFiles.push(path.join(dir, file));
            }
        }
    });
}

traverseDirCSS(path.join(__dirname, 'dist'));

let astifiedCss = [];

for (const file of cssFiles) {
    astifiedCss.push({
        file: file.replace(path.join(__dirname, 'dist'), '').replaceAll('\\', '/').slice(1),
        ast: postcss.parse(fs.readFileSync(file, 'utf8'), { parser: safe })
    });
}

let moddedCss = [];

process.stdout.write('Loading styles from repos...');

let addedStyles = args.styles.split(',').map(x => x.trim());
for (const cache of repo_cache) {
    for (const style of cache.styles) {
        if (!addedStyles.includes(style)) continue;
        process.stdout.clearLine();
        process.stdout.write('\rLoading style ' + style + ' from repo ' + cache.repo + '...');
        try {
            const txt = await (await request("https://raw.githubusercontent.com/" + cache.repo + "/main/" + style + ".bcss")).body.text();
            moddedCss.push({
                name: style,
                css: txt
            });
        } catch (e) {
            process.stdout.clearLine();
            process.stdout.write('\rLoading style ' + style + ' from repo ' + cache.repo + '... Failed! Skipping...');
        }
    }    
}

process.stdout.clearLine();
process.stdout.write('\rLoading styles from repos... Done!\n');

for (const ast of astifiedCss) {
    for (let mod of moddedCss) {
        if (mod.css.startsWith('{PATCH ' + ast.file + '}')) {
            mod.css = mod.css.replace('{PATCH ' + ast.file + '}', '');     
            ast.ast = ast.ast.append(postcss.parse(mod.css, { parser: safe }));
        }
    }
}

process.stdout.clearLine();
process.stdout.write('\rCompiling CSS...\n');

let stringifiedCss = [];
for (const ast of astifiedCss) {
    stringifiedCss.push({
        file: ast.file,
        css: ast.ast.toString()
    });
}

for (const stringed in stringifiedCss) {
    let compiled = await postcss([min()]).process(stringifiedCss[stringed].css, { parser: safe }).css;
    stringifiedCss[stringed].css = compiled;
    fs.writeFileSync(path.join(__dirname, 'dist', stringifiedCss[stringed].file), compiled);
}

process.stdout.clearLine();
process.stdout.write('\rDone!\n');
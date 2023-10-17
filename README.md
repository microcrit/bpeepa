<div align="center">
    <img src="https://raw.githubusercontent.com/probablyacai/bpeepa/main/images/bpeepa.png" width="40%">
    <h3>bpeepa</h3>
    <p><strong>B</strong>lacket <strong>P</strong>atching, <strong>E</strong>xtension, <strong>E</strong>xtras and <strong>P</strong>arsing <strong>A</strong>rchitecture</p>
    <h4>Simple patching of a Blacket server before it is set up.</h4>
</div>

<h5><strong>///</strong> use</h5>

```
mkdir peepa-server
cd peepa-server
git clone https://github.com/probablyacai/bpeepa.git .
npm i
node . --plugins Plugin1,Plugin2,etc --styles Style1,Style2,etc
```

After running, you may set up your server by changing the configuration settings. Refer to the [official guide](https://github.com/XoticLLC/Blacket).

**Note**: Do not package this into an NPM module. It will write files solely to its own directory. BPeepa depends on the use of __dirname for safe access to paths regardless of current directory, and it is meant to be used locally.

<h5><strong>///</strong> dev</h5>

Please refer to <a href="https://github.com/probablyacai/peepa-repo/blob/main/BeanLoader.js">the example plugin</a> for help.
If you need further help with AST, please refer to the <a href="https://github.com/babel/babel/blob/main/packages/babel-parser/ast/spec.md">Babel AST spec</a>.

Stylesheets are in a beta state. Please write them as normal with a ```.bcss``` extension.    
Add {PATCH file/file/etc} to the top to specify a file.

<h5><strong>///</strong> collect</h5>

Collect plugins and put them into a repository (with valid permission, or if you are the author, ignore). Open an <a href="https://github.com/probablyacai/peepa-repo/issues">issue</a> or <a href="https://github.com/probablyacai/peepa-repo/pulls">pull request</a> and add your repository in user/repo format to <a href="https://github.com/probablyacai/bpeepa/blob/main/REPOSITORIES.json">REPOSITORIES.json</a>

<br><br><br>

Under no license. Completely free to use for any legal purpose.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
function renameFolder(path, name) {
    let newPath = path + "\\..\\" + name;
    copyFolder(path, newPath);
    deleteFolder(path);
}
exports.renameFolder = renameFolder;
function createFile(path, content) {
    if (!pathExists(path)) {
        fs.writeFileSync(path, content, "utf-8");
    }
}
exports.createFile = createFile;
function openFile(path) {
    createFile(path, "{\n\"langs\": []\n}");
    vscode.workspace.openTextDocument(path).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}
exports.openFile = openFile;
function getModifyDateFolder(path) {
    let date;
    getFiles(path).forEach(file => {
        let stat = fs.statSync(path + "\\" + file);
        let mtime = stat.mtime;
        if (date < mtime || date === undefined) {
            date = mtime;
        }
    });
    getFolders(path).forEach(folder => {
        let mtime = getModifyDateFolder(path + "\\" + folder);
        if (date < mtime || date === undefined) {
            date = mtime;
        }
    });
    return date;
}
exports.getModifyDateFolder = getModifyDateFolder;
function pathExists(path) {
    try {
        fs.accessSync(path);
    }
    catch (err) {
        return false;
    }
    return true;
}
exports.pathExists = pathExists;
function createFolder(dir) {
    if (!pathExists(dir)) {
        fs.mkdirSync(dir);
    }
}
exports.createFolder = createFolder;
function deleteFolder(path) {
    if (pathExists(path)) {
        getFiles(path).forEach(file => fs.unlinkSync(path + "\\" + file));
        getFolders(path).forEach(folder => deleteFolder(path + "\\" + folder));
        fs.rmdirSync(path);
    }
}
exports.deleteFolder = deleteFolder;
function copyFile(source, dest) {
    fs.writeFileSync(dest, fs.readFileSync(source));
}
exports.copyFile = copyFile;
function copyFolder(source, dest) {
    createFolder(dest);
    getFolders(source).forEach(dir => copyFolder(source + "\\" + dir, dest + "\\" + dir));
    getFiles(source).forEach(file => copyFile(source + "\\" + file, dest + "\\" + file));
}
exports.copyFolder = copyFolder;
function getFolders(source) {
    return fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
}
exports.getFolders = getFolders;
function getFiles(source) {
    return fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name);
}
exports.getFiles = getFiles;
//# sourceMappingURL=file.js.map
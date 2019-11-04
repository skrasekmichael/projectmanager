"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const ignore_1 = require("./ignore");
function comparePaths(path1, path2) {
    let a = path1.toLocaleLowerCase().split("\\").join("/");
    let b = path2.toLocaleLowerCase().split("\\").join("/");
    return a === b;
}
exports.comparePaths = comparePaths;
function renameFolder(path, name) {
    let newPath = path + "/../" + name;
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
    createFile(path, "{\n\t\"langs\": []\n}");
    vscode.workspace.openTextDocument(path).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}
exports.openFile = openFile;
function getAllFolders(root, path, ignore) {
    let prefix = path.substr(root.length);
    let folders = getFolders(path).map(folder => prefix + "/" + folder);
    folders = ignore.filter(folders);
    folders.forEach(folder => {
        folders.concat(getAllFolders(root, root + folder, ignore));
    });
    return folders;
}
function getAllFiles(root, folders) {
    let allfiles = [];
    folders.forEach(folder => {
        let files = getFiles(root + folder).map(file => folder + "/" + file);
        allfiles = allfiles.concat(files);
    });
    return allfiles;
}
function getLastModifyDate(path) {
    let date;
    let ignore = new ignore_1.Ignore(path);
    let folders = [""].concat(getAllFolders(path, path, ignore));
    let files = getAllFiles(path, folders);
    files = ignore.filter(files);
    files.forEach(file => {
        let stat = fs.statSync(path + "/" + file);
        let mtime = stat.mtime;
        if (date < mtime || date === undefined) {
            date = mtime;
        }
    });
    return date;
}
exports.getLastModifyDate = getLastModifyDate;
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
        getFiles(path).forEach(file => fs.unlinkSync(path + "/" + file));
        getFolders(path).forEach(folder => deleteFolder(path + "/" + folder));
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
    getFolders(source).forEach(dir => copyFolder(source + "/" + dir, dest + "/" + dir));
    getFiles(source).forEach(file => copyFile(source + "/" + file, dest + "/" + file));
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
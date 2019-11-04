import * as vscode from "vscode";
import * as fs from "fs";
import { Ignore } from "./ignore";

export function comparePaths(path1: string, path2: string) {
    let a = path1.toLocaleLowerCase().split("\\").join("/");
    let b = path2.toLocaleLowerCase().split("\\").join("/");
    return a === b;
}

export function renameFolder(path: string, name: string) {
    let newPath = path + "/../" + name;
    copyFolder(path, newPath);
    deleteFolder(path);
}

export function createFile(path: string, content: string) {
    if (!pathExists(path)) {
        fs.writeFileSync(path, content, "utf-8");
    }
}

export function openFile(path: string) {
    createFile(path, "{\n\t\"langs\": []\n}");
    vscode.workspace.openTextDocument(path).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

function getAllFolders(root: string, path: string, ignore: Ignore): string[] {
    let prefix = path.substr(root.length);
    let folders = getFolders(path).map(folder => prefix + "/" + folder);
    folders = ignore.filter(folders);
    folders.forEach(folder => {
        folders.concat(getAllFolders(root, root + folder, ignore));
    });
    return folders;
}

function getAllFiles(root: string, folders: string[]): string[] {
    let allfiles: string[] = [];
    folders.forEach(folder => {
        let files = getFiles(root + folder).map(file => folder + "/" + file);
        allfiles = allfiles.concat(files);
    });
    return allfiles;
}

export function getLastModifyDate(path: string): Date | undefined {
    let date: Date | undefined;
    let ignore = new Ignore(path);

    let folders = [""].concat(getAllFolders(path, path, ignore));
    let files = getAllFiles(path, folders);
    files = ignore.filter(files);

    files.forEach(file => {
        let stat = fs.statSync(path + "/" + file);
        let mtime = stat.mtime;

        if (date! < mtime || date === undefined) {
            date = mtime;
        }
    });

    return date;
}

export function pathExists(path: string): boolean {
    try {
        fs.accessSync(path);
    } catch (err) {
        return false;
    }

    return true;
}

export function createFolder(dir: string) {
    if (!pathExists(dir)) {
        fs.mkdirSync(dir);
    }
}

export function deleteFolder(path: string) {
    if (pathExists(path)) {
        getFiles(path).forEach(file => fs.unlinkSync(path + "/" + file));
        getFolders(path).forEach(folder => deleteFolder(path + "/" + folder));
        fs.rmdirSync(path);
    }
}

export function copyFile(source: string, dest: string) {
    fs.writeFileSync(dest, fs.readFileSync(source));
}

export function copyFolder(source: string, dest: string) {
    createFolder(dest);
    getFolders(source).forEach(dir => copyFolder(source + "/" + dir, dest + "/" + dir));
    getFiles(source).forEach(file => copyFile(source + "/" + file, dest + "/" + file));
}

export function getFolders(source: string): string[] {
    return fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
}

export function getFiles(source: string): string[] {   
    return fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name);
}

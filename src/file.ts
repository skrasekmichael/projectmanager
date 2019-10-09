import * as vscode from "vscode";
import * as fs from "fs";

export function renameFolder(path: string, name: string) {
    let newPath = path + "\\..\\" + name;
    copyFolder(path, newPath);
    deleteFolder(path);
}

export function createFile(path: string, content: string) {
    if (!pathExists(path)) {
        fs.writeFileSync(path, content, "utf-8");
    }
}

export function openFile(path: string) {
    createFile(path, "{\n\"langs\": []\n}");
    vscode.workspace.openTextDocument(path).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

export function getModifyDateFolder(path: string): Date | undefined {
    let date: Date | undefined;

    getFiles(path).forEach(file => {
        let stat = fs.statSync(path + "\\" + file);
        let mtime = stat.mtime;

        if (date!! < mtime || date === undefined) {
            date = mtime;
        }
    });

    getFolders(path).forEach(folder => {
        let mtime = getModifyDateFolder(path + "\\" + folder);
        if (date!! < mtime!! || date === undefined) {
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
        getFiles(path).forEach(file => fs.unlinkSync(path + "\\" + file));
        getFolders(path).forEach(folder => deleteFolder(path + "\\" + folder));
        fs.rmdirSync(path);
    }
}

export function copyFile(source: string, dest: string) {
    fs.writeFileSync(dest, fs.readFileSync(source));
}

export function copyFolder(source: string, dest: string) {
    createFolder(dest);
    getFolders(source).forEach(dir => copyFolder(source + "\\" + dir, dest + "\\" + dir));
    getFiles(source).forEach(file => copyFile(source + "\\" + file, dest + "\\" + file));
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

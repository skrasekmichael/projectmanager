"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const file = require("./file");
const path = require("path");
class Window {
    constructor(config) {
        this.config = config;
    }
    openFolder(path) {
        let uri = vscode.Uri.file(path);
        return vscode.commands.executeCommand("vscode.openFolder", uri);
    }
    showInput(input, check) {
        return new Promise((resolve, reject) => {
            vscode.window.showInputBox(input).then(val => {
                if (val === undefined) {
                    reject();
                }
                if (check(val)) {
                    resolve(val);
                }
                else {
                    this.showInput(input, check).then(e => resolve(e));
                }
            });
        });
    }
    pick(items) {
        let langs = this.config.getProjects().langs;
        return new Promise((resolve, reject) => {
            items = items.concat(langs.map(lang => ({ label: lang.name })));
            vscode.window.showQuickPick(items, { placeHolder: "Pick project" }).then(item => {
                if (item) {
                    if (item.description) {
                        let project = this.config.lastProjects.projects.find(project => file.comparePaths(project.path, item.detail));
                        resolve({ data: project, type: 0 });
                    }
                    else {
                        let lang = langs.find(lang => lang.name === item.label);
                        resolve({ data: lang, type: 1 });
                    }
                }
                else {
                    reject();
                }
            });
        });
    }
    pickLanguage() {
        return new Promise((resolve, reject) => {
            this.pick([]).then(obj => resolve(obj.data));
        });
    }
    pickProject() {
        let items = [];
        if (!this.config.settings.lastProjects || this.config.settings.lastProjects) {
            for (let i = this.config.lastProjects.projects.length - 1; i >= 0; i--) {
                let project = this.config.lastProjects.projects[i];
                let label = project.path[0].toUpperCase() + project.path.slice(1);
                items.push({
                    label: path.basename(label),
                    alwaysShow: true,
                    description: "last work in " + project.lang,
                    detail: label
                });
            }
        }
        return new Promise((resolve, reject) => {
            this.pick(items).then(obj => {
                if (obj.type === 0) {
                    resolve(obj.data);
                }
                else {
                    let lang = obj.data;
                    let folders = ["."].concat((file.getFolders(lang.path)));
                    vscode.window.showQuickPick(folders, { placeHolder: "Pick project" }).then(folder => {
                        if (folder === undefined) {
                            reject();
                        }
                        resolve({
                            lang: lang.id,
                            path: lang.path + "/" + folder
                        });
                    });
                }
            });
        });
    }
}
exports.Window = Window;
//# sourceMappingURL=window.js.map
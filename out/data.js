"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const file_1 = require("./file");
class ProjectNodeProvider {
    constructor(config) {
        this.config = config;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        let langs = this.config.getProjects().langs;
        if (langs.length === 0) {
            return Promise.resolve([]);
        }
        if (element) {
            let lang = langs.find((val) => val.id === element.id);
            if (lang) {
                return Promise.resolve(this.getProjects(lang.id, lang.path));
            }
            else {
                return Promise.resolve([]);
            }
        }
        else {
            let items = new Array(langs.length);
            for (let i = 0; i < langs.length; i++) {
                let item = new ProjectItem(langs[i].name, langs[i].path, vscode.TreeItemCollapsibleState.Collapsed, "projectFolder", langs[i], undefined);
                item.id = langs[i].id;
                items[i] = item;
            }
            return Promise.resolve(items);
        }
    }
    getProjects(id, source) {
        let dirs = file_1.getFolders(source);
        let elements = new Array(dirs.length);
        elements.push(new ProjectItem(".", "current folder", vscode.TreeItemCollapsibleState.None, "project", source + "/.", {
            command: "projectmanager.openProject",
            title: "",
            arguments: [source, id]
        }));
        dirs.forEach(element => {
            let date = file_1.getLastModifyDate(source + "/" + element);
            elements.push(new ProjectItem(element, (date ? date.toLocaleString() : ""), vscode.TreeItemCollapsibleState.None, "project", source + "/" + element, {
                command: "projectmanager.openProject",
                title: "",
                arguments: [source + "/" + element, id]
            }));
        });
        return elements;
    }
}
exports.ProjectNodeProvider = ProjectNodeProvider;
class ProjectItem extends vscode.TreeItem {
    constructor(label, version, collapsibleState, contextValue, tag, command) {
        super(label, collapsibleState);
        this.label = label;
        this.version = version;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.tag = tag;
        this.command = command;
    }
    get tooltip() {
        return `${this.label}-${this.version}`;
    }
    get description() {
        return this.version;
    }
}
exports.ProjectItem = ProjectItem;
//# sourceMappingURL=data.js.map
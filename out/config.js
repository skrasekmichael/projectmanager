"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const file_1 = require("./file");
class Config {
    constructor(root, ext) {
        this.root = root;
        this.ext = ext;
        this.lastProjects = { projects: [] };
        this.path = root + "/settings.json";
        this.projects = root + "/lastProjects.json";
        if (!file_1.pathExists(this.path)) {
            file_1.openFile(this.path);
        }
        this.load();
        fs.watchFile(this.path, () => {
            this.load();
            if (this.onChangeSettings) {
                this.onChangeSettings();
            }
        });
    }
    load() {
        try {
            this.settings = JSON.parse(fs.readFileSync(this.path, "utf8"));
            this.settings.$schema = "file:" + this.ext + "/resources/schema.json";
            this.save();
            if (file_1.pathExists(this.projects)) {
                this.lastProjects = JSON.parse(fs.readFileSync(this.projects, "utf8"));
                this.lastProjects.projects = this.lastProjects.projects.filter(project => file_1.pathExists(project.path));
                this.delLastProjects();
            }
        }
        catch (err) {
            vscode.window.showInformationMessage(err.message);
        }
    }
    editProject(project) {
        if (!this.settings.lastProjects || this.settings.lastProjects) {
            let index = -1;
            this.lastProjects.projects.map(proc => proc.path).filter((path, j) => {
                if (file_1.comparePaths(path, project.path)) {
                    index = j;
                }
            });
            if (index > 0) {
                this.lastProjects.projects.splice(index, 1);
            }
            this.lastProjects.projects.push(project);
            this.delLastProjects();
        }
    }
    delLastProjects() {
        let len = this.settings.lastProjectsCount ? this.settings.lastProjectsCount : 5;
        if (this.lastProjects.projects.length > len) {
            this.lastProjects.projects = this.lastProjects.projects.slice(this.lastProjects.projects.length - len);
        }
        this.saveLastProjects();
    }
    saveLastProjects() {
        fs.writeFile(this.projects, JSON.stringify(this.lastProjects, undefined, 3), function (err) {
            if (err) {
                vscode.window.showInformationMessage(err.message);
            }
        });
    }
    removeProject(path) {
        let project = this.lastProjects.projects.find(project => file_1.comparePaths(path, project.path));
        if (project) {
            let index = this.lastProjects.projects.indexOf(project);
            if (index > 0) {
                this.lastProjects.projects.splice(index, 1);
            }
        }
    }
    getProjects() {
        return this.settings;
    }
    addLang(lang) {
        this.settings.langs.push(lang);
    }
    getLang(id) {
        return this.settings.langs.find((lang) => lang.id === id);
    }
    removeLang(lang) {
        let data = this.settings;
        data.langs.splice(data.langs.indexOf(lang), 1);
    }
    addTemplate(langId, template) {
        let lang = this.settings.langs.find((lang) => lang.id === langId);
        if (lang.types) {
            lang.types.push(template);
        }
        else {
            lang.types = [template];
        }
    }
    deleteTemplate(lang, template) {
        lang.types.splice(lang.types.indexOf(template), 1);
    }
    save() {
        fs.writeFile(this.path, JSON.stringify(this.settings, undefined, 3), function (err) {
            if (err) {
                vscode.window.showInformationMessage(err.message);
            }
        });
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map
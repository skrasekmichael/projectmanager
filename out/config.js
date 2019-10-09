"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const file_1 = require("./file");
class Config {
    constructor(path) {
        this.path = path;
        this.data = {};
        if (!file_1.pathExists(path)) {
            file_1.openFile(path);
        }
        this.load();
        fs.watchFile(path, () => {
            this.load();
            if (this.onChangeSettings) {
                this.onChangeSettings();
            }
        });
    }
    load() {
        try {
            this.data = JSON.parse(fs.readFileSync(this.path, "utf8"));
        }
        catch (err) {
            vscode.window.showInformationMessage(err.message);
        }
    }
    getProjects() {
        return this.data;
    }
    addLang(lang) {
        this.data.langs.push(lang);
    }
    removeLang(lang) {
        let data = this.data;
        data.langs.splice(data.langs.indexOf(lang), 1);
    }
    addAppType(langId, type) {
        let lang = this.data.langs.filter(lang => lang.id === langId)[0];
        if (lang.types) {
            lang.types.push(type);
        }
        else {
            lang.types = [type];
        }
    }
    deleteAppType(lang, type) {
        lang.types.splice(lang.types.indexOf(type), 1);
    }
    save() {
        fs.writeFile(this.path, JSON.stringify(this.data, undefined, 3), function (err) {
            if (err) {
                vscode.window.showInformationMessage(err.message);
            }
        });
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map
import * as vscode from "vscode";
import * as fs from "fs";
import { openFile, pathExists } from "./file";

export class Config {
    private data: object = {};
    public onChangeSettings: (() => void) | undefined;

    constructor (public path: string) {
        if (!pathExists(path)) {
            openFile(path);
        }

        this.load();
        fs.watchFile(path, () => {
            this.load();
            if (this.onChangeSettings) {
                this.onChangeSettings();
            }
        });
    }

    private load() {
        try {
            this.data = JSON.parse(fs.readFileSync(this.path, "utf8"));
        } catch (err) {
            vscode.window.showInformationMessage(err.message);
        }
    }

    public getProjects() : JSONSettings {
        return (this.data as JSONSettings);
    }

    public addLang(lang: JSONLang) {
        (this.data as JSONSettings).langs.push(lang);
    }

    public removeLang(lang: JSONLang) {
        let data: JSONSettings = this.data as JSONSettings;
        data.langs.splice(data.langs.indexOf(lang), 1);
    }

    public addAppType(langId: string, type: JSONAppType) {
        let lang = (this.data as JSONSettings).langs.filter(lang => lang.id === langId)[0];
        if (lang.types) {
            lang.types.push(type);
        } else {
            lang.types = [type];
        }
    }

    public deleteAppType(lang: JSONLang, type: JSONAppType) {
        lang.types!!.splice(lang.types!!.indexOf(type), 1);
    }

    public save() {
        fs.writeFile(this.path, JSON.stringify(this.data, undefined, 3), function(err) {
            if (err) {
                vscode.window.showInformationMessage(err.message);
            }
        });
    }
}

export interface JSONSettings {
    langs: JSONLang[];
}

export interface JSONLang {
    id: string;
    name: string;
    path: string;
    types: JSONAppType[] | undefined;
}

export interface JSONAppType {
    id: string;
    name: string;
}

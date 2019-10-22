import * as vscode from "vscode";
import * as fs from "fs";
import { openFile, pathExists } from "./file";
import { IProject, ISettings, ITemplate, ILang, ILastProjects } from "./json";

export class Config {
    public data?: ISettings;
    public lastProjects?: ILastProjects;

    public onChangeSettings: (() => void) | undefined;

    public path: string;
    public projects: string;

    constructor (public root: string, public ext: string) {
        this.path = root + "/settings.json";
        this.projects = root + "/lastProjects.json";

        if (!pathExists(this.path)) {
            openFile(this.path);
        }

        this.load();
        fs.watchFile(this.path, () => {
            this.load();
            if (this.onChangeSettings) {
                this.onChangeSettings();
            }
        });
    }

    private load() {
        try {
            this.data = JSON.parse(fs.readFileSync(this.path, "utf8"));
            if (this.data!.$schema === undefined) {
                this.data!.$schema = "file:" + this.ext + "/resources/schema.json";
                this.save();
            }

            if (pathExists(this.projects)) {
                this.lastProjects = JSON.parse(fs.readFileSync(this.projects, "utf8"));
                this.lastProjects!.projects = this.lastProjects!.projects.filter(project => pathExists(project.path));
            } else {
                this.lastProjects = { projects: [] };
            }
        } catch (err) {
            vscode.window.showInformationMessage(err.message);
        }
    }

    public editProject(project: IProject) {
        let index = this.lastProjects!.projects.indexOf(project);
        if (index > 0) {
            this.lastProjects!.projects.splice(index, 1);
        }
        this.lastProjects!.projects.push(project);

        for (let i = 0; i < this.lastProjects!.projects.length - 5; i++) {
            this.lastProjects!.projects.pop();
        }

        fs.writeFile(this.projects, JSON.stringify(this.lastProjects, undefined, 3), function(err) {
            if (err) {
                vscode.window.showInformationMessage(err.message);
            }
        });
    }

    public removeProject(path: string) {
        let project = this.lastProjects!.projects.find(project => project.path.toLowerCase() === path.toLowerCase());
        if (project) {
            let index = this.lastProjects!.projects.indexOf(project);
            if (index > 0) {
                this.lastProjects!.projects.splice(index, 1);
            }
        }
    }

    public getProjects() : ISettings {
        return this.data!;
    }

    public addLang(lang: ILang) {
        this.data!.langs.push(lang);
    }

    public getLang(id: string): ILang | undefined {
        return this.data!.langs.find((lang: ILang) => lang.id === id);
    }

    public removeLang(lang: ILang) {
        let data = this.data!;
        data.langs.splice(data.langs.indexOf(lang), 1);
    }

    public addTemplate(langId: string, template: ITemplate) {
        let lang: ILang = this.data!.langs.find((lang: ILang) => lang.id === langId)!;
        if (lang.types) {
            lang.types.push(template);
        } else {
            lang.types = [template];
        }
    }

    public deleteTemplate(lang: ILang, template: ITemplate) {
        lang.types!.splice(lang.types!.indexOf(template), 1);
    }

    public save() {
        fs.writeFile(this.path, JSON.stringify(this.data, undefined, 3), function(err) {
            if (err) {
                vscode.window.showInformationMessage(err.message);
            }
        });
    }
}

import * as vscode from "vscode";
import * as fs from "fs";
import { openFile, pathExists, comparePaths } from "./file";
import { IProject, ISettings, ITemplate, ILang, ILastProjects } from "./json";

export class Config {
    public settings?: ISettings;
    public lastProjects: ILastProjects = { projects: [] };

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
            this.settings = JSON.parse(fs.readFileSync(this.path, "utf8"));
            if (this.settings!.$schema === undefined) {
                this.settings!.$schema = "file:" + this.ext + "/resources/schema.json";
                this.save();
            }

            if (pathExists(this.projects)) {
                this.lastProjects = JSON.parse(fs.readFileSync(this.projects, "utf8"));
                this.lastProjects.projects = this.lastProjects.projects.filter(project => pathExists(project.path));
                this.delLastProjects();
            }
        } catch (err) {
            vscode.window.showInformationMessage(err.message);
        }
    }

    public editProject(project: IProject) {
        if (!this.settings!.lastProjects || this.settings!.lastProjects!) {
            let index = -1;
            this.lastProjects.projects.map(proc => proc.path).filter((path, j) => {
                if (comparePaths(path, project.path)) {
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

    private delLastProjects() {
        let len = this.settings!.lastProjectsCount ? this.settings!.lastProjectsCount : 5;
        for (let i = 0; i < this.lastProjects.projects.length - len; i++) {
            this.lastProjects.projects.pop();
        }
        this.saveLastProjects();
    }

    private saveLastProjects() {
        fs.writeFile(this.projects, JSON.stringify(this.lastProjects, undefined, 3), function(err) {
            if (err) {
                vscode.window.showInformationMessage(err.message);
            }
        });
    }

    public removeProject(path: string) {
        let project = this.lastProjects.projects.find(project => comparePaths(path, project.path));
        if (project) {
            let index = this.lastProjects.projects.indexOf(project);
            if (index > 0) {
                this.lastProjects.projects.splice(index, 1);
            }
        }
    }

    public getProjects() : ISettings {
        return this.settings!;
    }

    public addLang(lang: ILang) {
        this.settings!.langs.push(lang);
    }

    public getLang(id: string): ILang | undefined {
        return this.settings!.langs.find((lang: ILang) => lang.id === id);
    }

    public removeLang(lang: ILang) {
        let data = this.settings!;
        data.langs.splice(data.langs.indexOf(lang), 1);
    }

    public addTemplate(langId: string, template: ITemplate) {
        let lang: ILang = this.settings!.langs.find((lang: ILang) => lang.id === langId)!;
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
        fs.writeFile(this.path, JSON.stringify(this.settings, undefined, 3), function(err) {
            if (err) {
                vscode.window.showInformationMessage(err.message);
            }
        });
    }
}

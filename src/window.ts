import * as JSON from "./json";
import * as vscode from "vscode";
import { Config } from "./config";
import * as file from "./file";

interface Data 
{
	data: JSON.IProject | JSON.ILang;
	type: Number;
}

export class Window {
	constructor(public config: Config) {}

	public openFolder(path: string) : Thenable<unknown> {
		let uri = vscode.Uri.file(path);
		return vscode.commands.executeCommand("vscode.openFolder", uri);
	}

	public showInput(input: vscode.InputBoxOptions, check: (value: string | undefined) => boolean): Thenable<string | undefined> {
		return new Promise<string>((resolve, reject) => {
			vscode.window.showInputBox(input).then(val => {
				if (val === undefined) {
					reject();
				}

				if (check(val)) {
					resolve(val);
				} else {
					this.showInput(input, check).then(e => resolve(e));
				}
			});
		});
	}

	private pick(items: vscode.QuickPickItem[]): Thenable<Data> {
		let langs = this.config.getProjects().langs;

		return new Promise<Data>((resolve, reject) => {
			vscode.window.showQuickPick(
				items.concat(langs.map(lang => ({ label: lang.name } as vscode.QuickPickItem))),
				{ 
					canPickMany: false,
					placeHolder: "Pick project",
				}
			).then(langName => {
				if (langName === undefined) {
					reject();
				}

				if (langName!.description === "last work") {
					let project = this.config.lastProjects!.projects.find(project => project.path.toLowerCase() === langName!.label.toLowerCase());
					resolve({ data: project, type: 0 } as Data);
				} else {
					let lang = langs.find(lang => lang.name === langName!.label);
					resolve({ data: lang, type: 1 } as Data);
				}
			});
		});
	}

	public pickLanguage(): Thenable<JSON.ILang> {
		return new Promise<JSON.ILang>((resolve, reject) => {
			this.pick([]).then(obj => resolve(obj.data as JSON.ILang));
		});
	}

	public pickProject(): Thenable<JSON.IProject> {
		let items: vscode.QuickPickItem[] = [];

		this.config.lastProjects!.projects.forEach(project => {
			let label = project.path[0].toUpperCase() + project.path.slice(1);
			items.push({
				label: label,
				alwaysShow: true,
				description: "last work"
			});
		});

		return new Promise<JSON.IProject>((resolve, reject) => {
			this.pick(items).then(obj => {
				if (obj.type === 0) {
					resolve(obj.data as JSON.IProject);
				} else {
					let lang = obj.data as JSON.ILang;
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

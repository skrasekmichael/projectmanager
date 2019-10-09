import * as vscode from "vscode";
import { ProjectNodeProvider, ProjectItem } from "./data";
import { Config, JSONLang, JSONAppType } from "./config";
import * as file from "./file";
import * as path from "path";

function openFolder(path: string) {
	let uri = vscode.Uri.file(path);
	vscode.commands.executeCommand("vscode.openFolder", uri).then(() => {
		vscode.window.showInformationMessage("Folder " + path + " has been opened. ");
	});
}

function showInput(input: vscode.InputBoxOptions, check: (value: string | undefined) => boolean): Thenable<string | undefined> {
	return new Promise<string>((resolve, reject) => {
		vscode.window.showInputBox(input).then(val => {
			if (val === undefined) {
				reject();
			}

			if (check(val)) {
				resolve(val);
			} else {
				showInput(input, check).then(e => resolve(e));
			}
		});
	});
}

function pickLanguage(config: Config): Thenable<JSONLang> {
	let langs = config.getProjects().langs;
	return new Promise<JSONLang>((resolve, reject) => {
		vscode.window.showQuickPick(langs.map(lang => lang.name)).then(langName => {
			if (langName === undefined) {
				reject();
			}

			let lang = langs.find(lang => lang.name === langName);
			resolve(lang);
		});
	});
}

function pickProject(config: Config): Thenable<string> {
	return new Promise<string>((resolve, reject) => {
		pickLanguage(config).then(lang => {
			let folders = ["."].concat((file.getFolders(lang.path)));
			vscode.window.showQuickPick(folders).then(folder => {
				if (folder === undefined) {
					reject();
				}

				resolve(lang.path + "\\" + folder);
			});
		});
	});
}

export function activate(context: vscode.ExtensionContext) {
	console.log("Project manager is activated. ");

	let root = context.globalStoragePath;
	if (!file.pathExists(root)) {
		file.createFolder(root);
	}

	let config = new Config(root + "\\settings.json");
	if (!file.pathExists(root + "\\templates")) {
		file.createFolder(root + "\\templates");
	}

	let provider = new ProjectNodeProvider(config);
	config.onChangeSettings = () => provider.refresh();

	vscode.window.registerTreeDataProvider("nodeProjects", provider);
	vscode.commands.registerCommand("projectmanager.openProject", (arg: string | undefined) => { 
		if (arg) {
			openFolder(arg as string);
		} else {
			pickProject(config).then(path => openFolder(path));
		}
	});
	vscode.commands.registerCommand("projectmanager.renameProject", (arg: ProjectItem | undefined) => {
		function rename(source: string) {
			if (source.endsWith(".")) {
				vscode.window.showErrorMessage("Selected folder is not project. ");
				return;
			}
			
			let folder = source + "\\..\\"; 
			let open = false;
			if (vscode.workspace.rootPath) {
				open = (path.parse(vscode.workspace.rootPath).dir === path.parse(source).dir);
			}

			function check(data: string | undefined): boolean {
				if (file.pathExists(folder + data!!)) {
					vscode.window.showInformationMessage("Project with name '" + data!! + "' already exist. ");
					return false;
				}
				return true;
			}

			showInput({ prompt: "Enter new project name" }, check).then(name => {
				file.renameFolder(source, name!!);
				if (open) {
					openFolder(folder + name!!);
				}
				provider.refresh();
			});
		}
		
		if (arg) {
			rename(arg.tag as string);
		} else {
			pickProject(config).then(project => rename(project));
		}
	});
	vscode.commands.registerCommand("projectmanager.deleteProject", (arg: ProjectItem | undefined) => {		
		function deleteProject(source: string) {
			if (source.endsWith(".")) {
				vscode.window.showErrorMessage("Selected folder is not project. ");
				return;
			}

			file.deleteFolder(source);
			provider.refresh();
			vscode.window.showInformationMessage("Project has been deleted. ");
		}

		if (arg) {
			deleteProject(arg.tag as string);
		} else {
			pickProject(config).then(path => deleteProject(path));
		}
	});
	vscode.commands.registerCommand("projectmanager.config", () => file.openFile(config.path));
	vscode.commands.registerCommand("projectmanager.removeLanguage", (arg: ProjectItem | undefined) => {
		function remove(lang: JSONLang) {
			config.removeLang(lang);
			config.save();

			file.deleteFolder(root + "/templates/" + lang.id);
			provider.refresh();
		}
		
		if (arg) {
			remove(arg.tag as JSONLang);
		} else {
			pickLanguage(config).then(lang => remove(lang));
		}
	});
	vscode.commands.registerCommand("projectmanager.addLanguage", () => {
		let langs = config.getProjects().langs;
		function check(data: string | undefined): boolean {
			if (langs.filter(lang => lang.name === data).length > 0) {
				vscode.window.showInformationMessage("Language with name '" + data + "' already exist. ");
				return false;
			}
			return true;
		}
		showInput({ prompt: "Enter language name" }, check).then(name => {
			let id = name!!.toLowerCase().replace(" ", "_");
			let openFolder = {
				canSelectMany: false,
				canSelectFiles: false, 
				canSelectFolders: true,
				openLabel: "Select folder"
			};

			vscode.window.showOpenDialog(openFolder).then(path => {
				config.addLang({
					id: id!!, 
					name: name!!,
					path: path!![0].fsPath,
					types: undefined
				});
				
				config.save();
				file.createFolder(root + "/templates/" + id!!);
			});
		});
	});
	vscode.commands.registerCommand("projectmanager.deleteTemplate", () => {
		pickLanguage(config).then(lang => {
			vscode.window.showQuickPick(lang.types!!.map(type => type.name)).then(typeName => {
				let type = lang.types!!.find(type => type.name === typeName)!!;
				
				config.deleteAppType(lang, type);
				config.save();

				file.deleteFolder(root + "/templates/" + lang.id + "/" + type.id);
			});
		});
	});
	vscode.commands.registerCommand("projectmanager.editTemplate", () => {
		pickLanguage(config).then(lang => {
			if (lang.types) {
				if (lang.types.length === 1) {
					openFolder(root + "/templates/" + lang.id + "/" + lang.types[0].id);
				} else {
					vscode.window.showQuickPick(lang.types.map(type => type.name)).then(typeName =>{
						let type = lang.types!!.find(type => type.name === typeName)!!;
						openFolder(root + "/templates/" + lang.id + "/" + type.id);
					});
				}
			} else {
				vscode.window.showInformationMessage("No templates. ");
			}
		});
	});
	vscode.commands.registerCommand("projectmanager.createTemplate", () => {
		pickLanguage(config).then(lang => {
			function check(data: string | undefined): boolean {
				let typeId = data!!.toLowerCase().replace(" ", "_");
				let dirName = typeId;
				if (data === "") {
					dirName = "default";
				}

				if (file.pathExists(root + "/templates/" + lang.id + "/" + dirName)) {
					vscode.window.showInformationMessage("Template '" + dirName + "' already exist. ");
					return false;
				}
				return true;
			}

			showInput({ prompt: "Enter template name (let empty to default)"}, check).then(template => {
				let typeId = template!!.toLowerCase().replace(" ", "_");
				let name = template;

				if (template === "") {
					typeId = "default";
					name = "(default)";
				}

				let type: JSONAppType = {
					id: typeId,
					name: name!!
				};

				config.addAppType(lang.id, type);
				config.save();

				file.createFolder(root + "/templates/" + lang.id + "/" + typeId);
				openFolder(root + "/templates/" + lang.id + "/" + typeId);
			});
		});
	});
	vscode.commands.registerCommand("projectmanager.createProject", (arg: ProjectItem | undefined) => {
		function createProject(lang: JSONLang) {
			function check(data: string | undefined): boolean {
				if (file.pathExists(lang.path + "\\" + data)) {
					vscode.window.showInformationMessage("Project with name '" + data + "' already exist. ");
					return false;
				}
				return true;
			}

			function create(type: string = "") {
				showInput({ prompt: "Enter project name" }, check).then(name => {
					if (file.pathExists(root + "\\templates\\" + lang.id + "\\" + type)) {
						file.copyFolder(root + "\\templates\\" + lang.id + "\\" + type, lang.path + "\\" + name);
					} else {
						file.createFolder(lang.path + "\\" + name);
					}

					openFolder(lang.path + "\\" + name);
					provider.refresh();
				});
			}

			if (lang.types) {
				if (lang.types.length > 1) {
					vscode.window.showQuickPick(lang.types.map(type => type.name)).then(typeName => {
						let type = lang.types!!.filter(type => type.name === typeName)[0];
						create(type.id);
					});
				} else {
					create(lang.types[0].id);
				}
			} else {
				create();
			}
		}
		
		if (arg) {
			createProject(arg.tag as JSONLang);
		} else {
			pickLanguage(config).then(lang => createProject(lang));
		}
	});
}

export function deactivate() {}

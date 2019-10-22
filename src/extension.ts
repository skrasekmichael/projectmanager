import * as vscode from "vscode";
import { ProjectNodeProvider, ProjectItem } from "./data";
import { Config } from "./config";
import * as JSON from "./json";
import * as file from "./file";
import * as path from "path";
import { Window } from "./window";

function runTask(command: string, folder: string) {

	let name = path.basename(folder);
	command = command.split("{workspaceName}").join(name);
	command = command.split("{workspaceFolder}").join(folder);

	try {
		let type = "shell";
		let task = new vscode.Task(
			{ type: type },
			vscode.workspace.getWorkspaceFolder(vscode.Uri.file(folder))!,
			"Project manager", //terminal name
			type, //source
			new vscode.ShellExecution(command, { cwd: folder }),
		);
		vscode.tasks.executeTask(task);
	} catch (err) {
		vscode.window.showInformationMessage(err);
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log("Project manager is activated. ");

	let root = context.globalStoragePath;
	if (!file.pathExists(root)) {
		file.createFolder(root);
	}

	let config = new Config(root, context.extensionPath);
	if (!file.pathExists(root + "/templates")) {
		file.createFolder(root + "/templates");
	}

	let window = new Window(config);
	let provider = new ProjectNodeProvider(config);
	config.onChangeSettings = () => provider.refresh();
 
	vscode.window.registerTreeDataProvider("nodeProjects", provider);
	vscode.commands.registerCommand("projectmanager.openProject", (arg1 : string, arg2: string) => { 
		if (arg1 && arg2) {
			config.editProject({
				lang: arg2,
				path: arg1
			});
			window.openFolder(arg1);
		} else {
			window.pickProject().then(project => {
				config.editProject(project);
				window.openFolder(project.path);
			});
		}
	});
	vscode.commands.registerCommand("projectmanager.renameProject", (arg: ProjectItem | undefined) => {
		function rename(source: string) {
			if (source.endsWith(".")) {
				vscode.window.showErrorMessage("Selected folder is not project. ");
				return;
			}
			
			let folder = source + "/../"; 
			let open = false;
			if (vscode.workspace.rootPath) {
				open = (path.parse(vscode.workspace.rootPath).dir === path.parse(source).dir);
			}

			function check(data: string | undefined): boolean {
				if (file.pathExists(folder + data!)) {
					vscode.window.showInformationMessage("Project with name '" + data! + "' already exist. ");
					return false;
				}
				return true;
			}

			window.showInput({ prompt: "Enter new project name" }, check).then(name => {
				file.renameFolder(source, name!);
				if (open) {
					window.openFolder(folder + name!);
				}
				provider.refresh();
			});
		}
		
		if (arg) {
			rename(arg.tag as string);
		} else {
			window.pickProject().then(project => rename(project.path));
		}
	});
	vscode.commands.registerCommand("projectmanager.deleteProject", (arg: ProjectItem | undefined) => {		
		function deleteProject(source: string) {
			if (source.endsWith(".")) {
				vscode.window.showErrorMessage("Selected folder is not project. ");
				return;
			}

			file.deleteFolder(source);
			config.removeProject(source);
			provider.refresh();
			vscode.window.showInformationMessage("Project has been deleted. ");
		}

		if (arg) {
			deleteProject(arg.tag as string);
		} else {
			window.pickProject().then(project => deleteProject(project.path));
		}
	});
	vscode.commands.registerCommand("projectmanager.config", () => file.openFile(config.path));
	vscode.commands.registerCommand("projectmanager.removeLanguage", (arg: ProjectItem | undefined) => {
		function remove(lang: JSON.ILang) {
			config.removeLang(lang);
			config.save();

			file.deleteFolder(root + "/templates/" + lang.id);
			provider.refresh();
		}
		
		if (arg) {
			remove(arg.tag as JSON.ILang);
		} else {
			window.pickLanguage().then(lang => remove(lang));
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
		window.showInput({ prompt: "Enter language name" }, check).then(name => {
			let id = name!.toLowerCase().split(" ").join("_");
			let openFolder = {
				canSelectMany: false,
				canSelectFiles: false, 
				canSelectFolders: true,
				openLabel: "Select folder"
			};

			vscode.window.showOpenDialog(openFolder).then(path => {
				config.addLang({
					id: id!, 
					name: name!,
					path: path![0].fsPath,
					types: undefined
				});
				
				config.save();
				file.createFolder(root + "/templates/" + id!);
			});
		});
	});
	vscode.commands.registerCommand("projectmanager.deleteTemplate", () => {
		window.pickLanguage().then(lang => {
			vscode.window.showQuickPick(lang.types!.map(type => type.name), { placeHolder: "Pick template to delete" }).then(typeName => {
				if (typeName) {
					let type = lang.types!.find(type => type.name === typeName)!;
					
					config.deleteTemplate(lang, type);
					config.save();

					file.deleteFolder(root + "/templates/" + lang.id + "/" + type.id);
				}
			});
		});
	});
	vscode.commands.registerCommand("projectmanager.editTemplate", () => {
		window.pickLanguage().then(lang => {
			if (lang.types) {
				if (lang.types.length === 1) {
					window.openFolder(root + "/templates/" + lang.id + "/" + lang.types[0].id);
				} else {
					vscode.window.showQuickPick(lang.types.map(type => type.name), { placeHolder: "Pick template to edit" }).then(typeName =>{
						let type = lang.types!.find(type => type.name === typeName)!;
						window.openFolder(root + "/templates/" + lang.id + "/" + type.id);
					});
				}
			} else {
				vscode.window.showInformationMessage("No templates. ");
			}
		});
	});
	vscode.commands.registerCommand("projectmanager.createTemplate", () => {
		window.pickLanguage().then(lang => {
			function check(data: string | undefined): boolean {
				let typeId = data!.toLowerCase().split(" ").join("_");
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

			window.showInput({ prompt: "Enter template name (let empty to default)"}, check).then(template => {
				let typeId = template!.toLowerCase().split(" ").join("_");
				let name = template;

				if (template === "") {
					typeId = "default";
					name = "(default)";
				}

				let type: JSON.ITemplate = {
					id: typeId,
					name: name!,
					copyFolder: true
				};

				config.addTemplate(lang.id, type);
				config.save();

				file.createFolder(root + "/templates/" + lang.id + "/" + typeId);
				window.openFolder(root + "/templates/" + lang.id + "/" + typeId);
			});
		});
	});
	vscode.commands.registerCommand("projectmanager.createProject", (arg: ProjectItem | undefined) => {
		function createProject(lang: JSON.ILang) {
			function check(data: string | undefined): boolean {
				if (file.pathExists(lang.path + "/" + data)) {
					vscode.window.showInformationMessage("Project with name '" + data + "' already exist. ");
					return false;
				}
				return true;
			}

			function create(type: JSON.ITemplate | undefined = undefined) {
				window.showInput({ prompt: "Enter project name" }, check).then(name => {
					if (type) {
						if ((type.copyFolder === undefined || type.copyFolder) && file.pathExists(root + "/templates/" + lang.id + "/" + type.id)) {
							file.copyFolder(root + "/templates/" + lang.id + "/" + type.id, lang.path + "/" + name);
						} else {
							file.createFolder(lang.path + "/" + name);
						}

						let source = lang.path + "/" + name;
						if (type.commands) {
							type.commands.forEach(command => {
								runTask(command.script, command.folder ? command.folder : source);
							});
						}
					} else {
						file.createFolder(lang.path + "/" + name);
					}

					config.editProject({
						lang: lang.id,
						path: lang.path + "/" + name
					});

					provider.refresh();
					vscode.window.showInformationMessage("Open project?", "YES", "NO").then(val => {
						if (val === "YES") {
							window.openFolder(lang.path + "/" + name);
						}
					});
				});
			}

			if (lang.types) {
				if (lang.types.length > 1) {
					vscode.window.showQuickPick(lang.types.map(type => type.name)).then(typeName => {
						let type = lang.types!.find(type => type.name === typeName);
						create(type);
					});
				} else {
					create(lang.types[0]);
				}
			} else {
				create();
			}
		}
		
		if (arg) {
			createProject(arg.tag as JSON.ILang);
		} else {
			window.pickLanguage().then(lang => createProject(lang));
		}
	});
}

export function deactivate() {}

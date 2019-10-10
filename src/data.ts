import * as vscode from "vscode";
import { Config, JSONLang } from "./config";
import { getFolders, getModifyDateFolder } from "./file";

export class ProjectNodeProvider implements vscode.TreeDataProvider<ProjectItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined> = new vscode.EventEmitter<ProjectItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined> = this._onDidChangeTreeData.event;

    constructor(private config: Config) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ProjectItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ProjectItem): Thenable<ProjectItem[]> {
        let langs : JSONLang[] = this.config.getProjects().langs;

		if (langs.length === 0) {
			return Promise.resolve([]);
		}

		if (element) {
            let lang = langs.filter((val: JSONLang) => val.id === element!!.id);
            if (lang.length > 0) {
                return Promise.resolve(this.getProjects(lang[0].path));
            } else {
                return Promise.resolve([]);
            }
		} else {
            let items: ProjectItem[] = new Array(langs.length);
            for (let i = 0; i < langs.length; i++) {
                let item = new ProjectItem(
                    langs[i].name, 
                    langs[i].path, 
                    vscode.TreeItemCollapsibleState.Collapsed, 
                    "projectFolder",
                    langs[i],
                    undefined
                );
                item.id = langs[i].id;
                items[i] = item;
            }
			return Promise.resolve(items);
		}
    }

    private getProjects(source: string) : ProjectItem[] {
        let dirs = getFolders(source);
        let elements: ProjectItem[] = new Array(dirs.length);

        elements.push(new ProjectItem(
            ".", 
            "current folder",
            vscode.TreeItemCollapsibleState.None,
            "project",
            source + "/.",
            {
                command: "projectmanager.openProject",
                title: "",
                arguments: [source]
            }
        ));

        dirs.forEach(element => {
            let date = getModifyDateFolder(source + "/" + element);
            elements.push(new ProjectItem(
                element, 
                (date ? date.toLocaleString() : ""),
                vscode.TreeItemCollapsibleState.None, 
                "project",
                source + "/" + element,
                {
                    command: "projectmanager.openProject",
                    title: "",
                    arguments: [source + "/" + element]
                },
            ));
        });

        return elements;
    }
}

export class ProjectItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		private version: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public contextValue: string,
        public tag: any,
        public readonly command?: vscode.Command
	) {
        super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}-${this.version}`;
	}

	get description(): string {
		return this.version;
	}
}

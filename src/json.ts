export interface ILastProjects {
    projects: IProject[];
}

export interface IProject {
    lang: string;
    path: string;
}

export interface ISettings {
    $schema: string;
    langs: ILang[];
}

export interface ILang {
    id: string;
    name: string;
    path: string;
    types?: ITemplate[];
}

export interface ITemplate {
    id: string;
    name: string;
    copyFolder?: boolean; //default true
    commands?: ICommand[];    
}

export interface ICommand {
    script: string;
    folder?: string; //null - current workspace
}

import * as fs from "fs";
const parser = require("gitignore-parser");

export class Ignore
{
    private ignores: any[];

    constructor(public root: string) {
        let names = [
            ".gitignore",
            ".ignore"
        ];

        this.ignores = [];
        names.forEach(name => {
            let path = root + "/" + name;
            if (fs.existsSync(path)) {
                this.ignores.push(parser.compile(fs.readFileSync(path, "utf8")));
            }
        });
    }

    public filter(data: string[]): string[] {
        this.ignores.forEach(filter => {
            data = data.filter(filter.accepts);
        });
        return data;
    }
}

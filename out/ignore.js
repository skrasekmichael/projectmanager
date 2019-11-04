"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const parser = require("gitignore-parser");
class Ignore {
    constructor(root) {
        this.root = root;
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
    filter(data) {
        this.ignores.forEach(filter => {
            data = data.filter(filter.accepts);
        });
        return data;
    }
}
exports.Ignore = Ignore;
//# sourceMappingURL=ignore.js.map
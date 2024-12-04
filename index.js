#! /usr/bin/env node
"use strict";

import fs from "node:fs";
import Interpreter from "./src/interpreter/index.js";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Error: A file name or path must be passed as an argument");
    process.exit(1);
} else if (args.length > 1) {
    console.error("Error: Only 1 argument must be passed (file_name/path)");
    process.exit(1);
} else if (!args[0].endsWith(".zoop")) {
    console.error("Error: Can only interpret files of type zoop (.zoop)");
    process.exit(1);
}

try {
    const buffer = fs.readFileSync(args[0]);
    const code = new TextDecoder().decode(buffer);

    const interpreter = new Interpreter(code);
    interpreter.run();
    process.exit(0);
} catch (e) {
    if (e.message.startsWith("ENOENT: no such file or director")) {
        console.error(`Error: N${e.message.slice(9, 20)} was found in path: ${e.message.slice(40)}`);
    } else console.error(e);

    process.exit(1);
}
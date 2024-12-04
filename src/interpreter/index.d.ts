import { Literal } from "../parser/expressions.js";

declare type ZoopContext = Map<string, Literal>;
declare type DebugOptions = ["lexer" | "parser"] | ["lexer", "parser"] | [
    "parser",
    "lexer",
];


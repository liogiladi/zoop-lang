import { TokenType as TToken } from "./tokens.js";

declare type Position = [line: number, char: number];
declare type TokenValue = string | number | boolean;

declare type TokenType = typeof TToken;

declare type TokenInit = {
    type: TokenType;
    lexeme: string;
    pos: Position;
    absPos: number;
    value?: TokenValue;
};

declare type Token = import("./tokens.js").Token;
declare type NumericTypes = ["int", "uint", "dec", "udec"];
declare type DataTypes = [...NumericTypes, "string", "bool", "label"];
declare type DataType = DataTypes[number] | "void";

declare type UnaryOperators = ["~", "-"];
declare type MathOperators = ["+", "-", "*", "/"];
declare type LogicOperators = ["&", "|", "||"];
declare type CompareOperators = ["<=", "<", ">=", ">", "=", "~="];
declare type BinaryOperators = ["~", "_", ...MathOperators, ...LogicOperators, ...CompareOperators];
declare type BinaryOperator = BinaryOperators[number];

declare type Keywords = ["if", "end if", "elif", "end elif", "else", "end else", "zoop", "end zoop", "de", "loop", "end loop", "end", ...DataTypes];

import {Position} from "../lexer/tokens";
import Expr from "./expressions.js";

declare type ZoopCall = (args: Expr[], callPos: Position) => Literal | undefined;

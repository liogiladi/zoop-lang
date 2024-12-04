"use strict";

import {
    ConditionBranch,
    ConditionStmt, EndStmt,
    ExprStmt, LoopStmt,
    PrintStmt,
    ReturnStmt,
    ScopeBlockStmt,
    Stmt,
    ZoopStmt,
} from "./statements.js";
import {wrapANSIColor} from "../utils.js";
import {
    BinaryExpr,
    CastingExpr,
    DeclarationExpr, DeExpr,
    Expr,
    GroupingExpr,
    InputExpr,
    Literal,
    LiteralExpr,
    ReturnLiteral,
    ReassignmentExpr,
    UnaryExpr,
    VariableExpr,
} from "./expressions.js";
import {Token} from "../lexer/tokens.js";

/**
 * @class Program
 */
export default class Program {
    /** @type {Stmt[]} */
    constructor() {
        this.body = [];
    }

    /**
     * @returns {string}
     */
    pretty() {
        let str = "[Program]\n";
        for (const node of this.body) {
            str += "|\n";
            str += this.#prettyNode(0, node);
        }
        return str;
    }

    /**
     * @private
     * @param {number} level
     * @param {string | Token | Stmt | Expr} node
     * @param {string} [label='']
     * @returns {string}
     */
    #prettyNode(level, node, label = "") {
        if (typeof node === "string") return this.#prettyBranch(level, node);
        if (node instanceof Token) return this.#prettyBranch(level, node.lexeme);
        if (node instanceof Literal) {
            if (node instanceof ReturnLiteral) return "";
            return this.#prettyLiteralBranch(level, node);
        }
        if (node instanceof Expr) {
            return this.#prettyExpression(level, node);
        }

        if (node instanceof Stmt) {
            let str = this.#prettyBranch(
                level,
                node.constructor.name,
                node instanceof EndStmt ? `38;5;206` : "1;37" ,
                label
            );

            if (node instanceof ExprStmt || node instanceof PrintStmt || node instanceof ReturnStmt) {
                if (node.expression) {
                    str += this.#prettyExpression(level + 1, node.expression);
                }
            } else if (node instanceof ScopeBlockStmt) {
                node.statements.forEach((statement) => {
                    str += this.#prettyNode(level + 1, statement);
                });
            } else if (node instanceof ConditionStmt) {
                str += this.#prettyNode(level + 1, node.thenBranch, "If");
                node.elifBranches?.forEach((condition) => {
                    str += this.#prettyNode(level + 1, condition, "Elif");
                });

                if (node.elseStatements?.length || -1 > 0) {
                    str += this.#prettyBranch(level + 1, "Else", "1;37");
                    node.elseStatements?.forEach((statement) => {
                        str += this.#prettyNode(level + 2, statement);
                    });
                }
            } else if (node instanceof ConditionBranch) {
                str += this.#prettyExpression(level + 1, node.expression);
                node.statements.forEach((statement) => {
                    str += this.#prettyNode(level + 1, statement);
                });
            } else if (node instanceof ZoopStmt) {
                str += this.#prettyLiteralBranch(level + 1, node.label);

                str += this.#prettyBranch(
                    level + 1,
                    node.returnType || "void",
                    `38;5;${Program.DATA_LITERAL_TO_COLOR.type}`
                );
                str += this.#prettyBranch(level + 1, "Parameters", "1;37");

                node.parameters.forEach((parameter) => {
                    str += this.#prettyBranch(
                        level + 2,
                        `${
                            wrapANSIColor("$", "38;5;206")
                        }${parameter.identifier}:${
                            wrapANSIColor(
                                parameter.type,
                                `38;5;${Program.DATA_LITERAL_TO_COLOR.type}`
                            )
                        }`
                    );
                });

                node.statements.forEach((statement) => {
                    str += this.#prettyNode(level + 1, statement);
                });
            } else if (node instanceof LoopStmt) {
                node.statements.forEach((statement) => {
                    str += this.#prettyNode(level + 1, statement);
                });
            } else if (node instanceof EndStmt) {
            } else {
                throw new Error(`node pretty not implemented - ${node.constructor.name}`);
            }

            return str;
        }
        throw new Error("node pretty not implemented");
    }

    spacer = "     ";
    connector = "-----";

    /**
     * @private
     * @param {number} level
     * @param {string} content
     * @param {number|string} [color]
     * @param {string} [label='']
     * @returns {string}
     */
    #prettyBranch(level, content, color, label = "") {
        const colorStr = typeof color === "string"
            ? color
            : color
                ? `38;5;${color}`
                : "";

        return `|${(this.spacer + (level === 1 ? "" : " ")).repeat(level)}${
            level !== 0 ? "|" : ""
        }${this.connector}[${`${
            label ? `${wrapANSIColor(label, "1;37")} ` : ""
        }`}${wrapANSIColor(content, colorStr)}]\n`;
    }

    static DATA_LITERAL_TO_COLOR = {
        bool: 200,
        string: 214,
        label: 226,
        int: 121,
        uint: 121,
        dec: 121,
        udec: 121,
        type: 79,
    };

    /**
     * @private
     * @param {number} level
     * @param {Literal} literal
     * @returns {string}
     */
    #prettyLiteralBranch(level, literal) {
        let value = literal.value + "";

        if (literal.type === "string") {
            value = `"${value}"`;
        } else if (literal.type === "label") {
            value = `\`${value}\``;
        } else if (literal.type === "udec" || literal.type === "uint") {
            value += "u";
        }

        return this.#prettyBranch(
            level,
            value,
            Program.DATA_LITERAL_TO_COLOR[literal.type]
        );
    }

    /**
     * @private
     * @param {number} level
     * @param {Expr} node
     * @returns {string}
     */
    #prettyExpression(level, node) {
        if (node instanceof LiteralExpr) {
            return this.#prettyLiteralBranch(level, node.info);
        }
        if (node instanceof VariableExpr) {
            return this.#prettyBranch(
                level,
                `${
                    wrapANSIColor(node.mutable ? "@" : "$", "38;5;206")
                }${node.identifier}`
            );
        }

        let str = this.#prettyBranch(level, node.constructor.name, "1;37");
        if (node instanceof UnaryExpr) {
            str += this.#prettyBranch(level + 1, node.operator.lexeme);
            str += this.#prettyNode(level + 1, node.right);
        } else if (node instanceof BinaryExpr) {
            str += this.#prettyNode(level + 1, node.left);
            str += this.#prettyNode(level + 1, node.operator);
            str += this.#prettyNode(level + 1, node.right);
        } else if (node instanceof DeclarationExpr) {
            str += this.#prettyBranch(level + 1, node.mutable ? "@" : "$", 206);
            str += this.#prettyBranch(level + 1, node.identifier);
            str += this.#prettyBranch(
                level + 1,
                node.type,
                Program.DATA_LITERAL_TO_COLOR.type
            );
            str += this.#prettyNode(level + 1, node.expression);
        } else if (node instanceof ReassignmentExpr) {
            str += this.#prettyBranch(level + 1, `${wrapANSIColor("@", "38;5;206")}${node.identifier}`);
            str += this.#prettyNode(level + 1, node.expression);
        } else if (node instanceof GroupingExpr) {
            str += this.#prettyExpression(level + 1, node.expression);
        } else if (node instanceof CastingExpr) {
            str += this.#prettyNode(level + 1, node.expression);
            str += this.#prettyBranch(level + 1, node.type);
        } else if (node instanceof InputExpr) {
            str += this.#prettyBranch(
                level + 1,
                node.type,
                Program.DATA_LITERAL_TO_COLOR.type
            );
            if (node.label) {
                str += this.#prettyBranch(
                    level + 1,
                    `\`${node.label}\``,
                    Program.DATA_LITERAL_TO_COLOR.label
                );
            }
        } else if (node instanceof DeExpr) {
            str += this.#prettyLiteralBranch(level + 1, node.label);
            str += this.#prettyBranch(level + 1, "Arguments", "1;37");
            node.args.forEach((arg) => {
                str += this.#prettyNode(level + 2, arg);
            });
        }

        return str;
    }
}

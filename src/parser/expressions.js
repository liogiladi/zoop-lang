"use strict";

import {Token, TokenType} from "../lexer/tokens.js";

export class Expr {
    /** @type {Position} **/
    position;

    /**
     * @param {Position} position
     */
    constructor(position) {
        this.position = position;
    }

    /**
     * @returns {string}
     */
    toString() {
        if (this instanceof LiteralExpr) {
            return this.info.toString();
        } else if (this instanceof GroupingExpr) {
            return `(group ${this.expression.toString()})`;
        } else if (this instanceof UnaryExpr) {
            return `(${this.right.toString()} ${this.operator.toString()})`;
        } else if (this instanceof BinaryExpr) {
            return `(${this.left.toString()} ${this.operator.value} ${this.right.toString()})`;
        } else if (this instanceof VariableExpr) {
            return `${this.mutable ? "@" : "$"}${this.identifier}`;
        } else {
            throw new Error("Unknown Expr type - " + this.toString());
        }
    }
}


export class Literal {
    /** @type {DataType | "label"} **/
    type;
    /** @type {LiteralValue} **/
    value;

    /**
     * @param {DataType} type
     * @param {LiteralValue} value
     */
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }

    /**
     * @param token {Token}
     * @returns {Literal}
     */
    static fromToken(token) {
        if (token.type !== TokenType.LITERAL) {
            throw new Error("Unrecognized Literal");
        }

        /** @type {DataType} **/
        let dataType;

        switch (typeof token.value) {
            case "boolean":
                dataType = "bool";
                break;
            case "string":
                if (/^`.+`$/g.test(token.lexeme)) dataType = "label";
                else dataType = "string";
                break;
            case "number": {
                const postfix = token.lexeme.at(-1);
                const isWhole = !token.lexeme.includes(".");

                dataType = /** @type {DataType} */ (`${postfix === "u" ? "u" : ""}${
                    isWhole ? "int" : "dec"
                }`);

                break;
            }
            default:
                throw new Error(`Unsupported literal ${token.lexeme}`);
        }

        return new Literal(dataType, token.value);
    }

    /**
     * @param {number} value
     * @param {string} [lexeme]
     * @returns {Literal}
     */
    static fromLexeme_DEBUG(value, lexeme) {
        return this.fromToken(
            new Token(
                TokenType.LITERAL,
                lexeme || value + "",
                [0, 0],
                0,
                value,
            ),
        );
    }
}

export class ReturnLiteral extends Literal {
    constructor() {
        super("void", "return");
    }
}

export class EndLiteral extends Literal {
    constructor() {
        super("void", "end");
    }
}

export class LiteralExpr extends Expr {
    /** @type {Literal} **/
    info;

    /**
     * @param {Literal} info
     * @param {Position} position
     */
    constructor(info, position) {
        super(position);
        this.info = info;
    }
}

export class DeclarationExpr extends Expr {
    /**
     * @param {boolean} mutable
     * @param {string} identifier
     * @param {DataType} type
     * @param {Expr} expression
     * @param {Position} position
     */
    constructor(mutable, identifier, type, expression, position) {
        super(position);
        this.mutable = mutable;
        this.identifier = identifier;
        this.type = type;
        this.expression = expression;
    }

    /**
     * @returns {string}
     */
    getLexeme() {
        return `${this.mutable ? "@" : "$"}${this.identifier}`;
    }
}

export class ReassignmentExpr extends Expr {
    /**
     * @param {string} identifier
     * @param {Expr} expression
     * @param {Position} position
     */
    constructor(identifier, expression, position) {
        super(position);
        this.identifier = identifier;
        this.expression = expression;
    }
}

export class GroupingExpr extends Expr {
    /**
     * @param {Expr} expression
     * @param {Position} position
     */
    constructor(expression, position) {
        super(position);
        this.expression = expression;
    }
}

export class UnaryExpr extends Expr {
    /**
     * @param {Token} operator
     * @param {Expr} right
     * @param {Position} position
     */
    constructor(operator, right, position) {
        super(position);
        this.operator = operator;
        this.right = right;
    }
}

export class BinaryExpr extends Expr {
    /**
     * @param {Expr} left
     * @param {Token} operator
     * @param {Expr} right
     * @param {Position} position
     */
    constructor(left, operator, right, position) {
        super(position);
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

export class VariableExpr extends Expr {
    /**
     * @param {boolean} mutable
     * @param {string} identifier
     * @param {Position} position
     */
    constructor(mutable, identifier, position) {
        super(position);
        this.mutable = mutable;
        this.identifier = identifier;
    }
}

export class CastingExpr extends Expr {
    /**
     * @param {Expr} expression
     * @param {DataType} type
     * @param {Position} position
     */
    constructor(expression, type, position) {
        super(position);
        this.expression = expression;
        this.type = type;
    }
}

export class InputExpr extends Expr {
    /**
     * @param {DataType} type
     * @param {Position} position
     * @param {Literal} label
     */
    constructor(type, position, label) {
        super(position);
        this.type = type;
        this.label = label;
    }
}

export class DeExpr extends Expr {
    /**
     * @param {Literal} label
     * @param {Expr[]} args
     * @param {Position} position
     */
    constructor(label, args, position) {
        super(position);
        this.label = label;
        this.args = args;
    }
}
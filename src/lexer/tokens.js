"use strict";

export const TokenType = Object.freeze({
    NONE: Symbol("NONE"),
    VARIABLE: Symbol("VARIABLE"),
    UNARY_OPERATOR: Symbol("UNARY_OPERATOR"),
    BINARY_OPERATOR: Symbol("BINARY_OPERATOR"),
    LITERAL: Symbol("LITERAL"),
    KEYWORD: Symbol("KEYWORD"),
    COMMENT: Symbol("COMMENT"),
    BLOCK_COMMENT: Symbol("BLOCK_COMMENT"),
    NEW_LINE: Symbol("NEW_LINE"),
    COLON: Symbol("COLON"),
    PARAN_OPEN: Symbol("PARAN_OPEN"),
    PARAN_CLOSE: Symbol("PARAN_CLOSE"),
    BLOCK_OPEN: Symbol("BLOCK_OPEN"),
    BLOCK_CLOSE: Symbol("BLOCK_CLOSE"),
    FLOW_IN: Symbol("FLOW_IN"),
    FLOW_OUT: Symbol("FLOW_OUT"),
    INPUT: Symbol("INPUT"),
    OUTPUT: Symbol("OUTPUT"),
    DIRECT: Symbol("DIRECT"),
});

export class Token {
    /** @type {symbol} **/
    type;
    /** @type {string} **/
    lexeme;
    /** @type {Position} **/
    position;
    /** @type {number} **/
    absPosition;
    /** @type {TokenValue | undefined} **/
    value;

    /**
     * @param {symbol} type
     * @param {string} lexeme
     * @param {Position} position
     * @param {Position} absPosition
     * @param {TokenValue} value
     */
    constructor(type, lexeme, position, absPosition, value) {
        Object.assign(this, {type, lexeme, position, absPosition, value});
    }

    /**
     * @param {TokenInit} init
     * @returns {Token}
     */
    static init({type, lexeme, position, absPosition, value}) {
        return new this(type, lexeme, position, absPosition, value);
    }
}

/** @type {Readonly<Record<string, symbol>>} **/
export const CHAR_TO_TOKEN_TYPE = Object.freeze({
    " ": TokenType.NONE,
    "\r": TokenType.NONE,
    "\n": TokenType.NEW_LINE,
    "@": TokenType.VARIABLE,
    $: TokenType.VARIABLE,
    "(": TokenType.PARAN_OPEN,
    ")": TokenType.PARAN_CLOSE,
    ":": TokenType.COLON,
})

/**
 * @param {string} val
 * @returns {boolean}
 */
export function validVariableId(val) {
    return /^[a-zA-Z]+[a-zA-Z\d]*$/g.test(val);
}

export const NUMERIC_TYPES = /** @type {NumericTypes} */ (["int", "uint", "dec", "udec"]);
export const DATA_TYPES = /** @type {DataTypes} */ ([...NUMERIC_TYPES, "string", "bool", "label"]);

export const UNARY_OPERATORS = /** @type {NumericTypes} */ (["~", "-"]);
export const MATH_OPERATORS = /** @type {MathOperators} */ ["+", "-", "*", "/"];
export const LOGIC_OPERATORS = /** @type {LogicOperators} */ ["&", "|", "||"];
export const COMPARE_OPERATORS = /** @type {CompareOperators} */ ["<=", "<", ">=", ">", "=", "~="];
export const BINARY_OPERATORS = /** @type {BinaryOperators} */ ["~", "_", ...MATH_OPERATORS, ...LOGIC_OPERATORS, ...COMPARE_OPERATORS];

export const KEYWORDS = /** @type {Keywords} */ (["if", "end if", "elif", "end elif", "else", "end else", "zoop", "end zoop", "de", "loop", "end loop", "end", ...DATA_TYPES]);

/**
 * @type {Readonly<Record<string, symbol>>}
 */
export const SLICES_TO_TOKEN_TYPE = Object.freeze({
    "{": TokenType.BLOCK_OPEN,
    "}": TokenType.BLOCK_CLOSE,
    "->|": TokenType.OUTPUT,
    "<-|": TokenType.INPUT,
    "->": TokenType.FLOW_OUT,
    "<-": TokenType.FLOW_IN,
    "=>": TokenType.DIRECT,
    ...UNARY_OPERATORS.reduce(
        (acc, op) => ({...acc, [op]: TokenType.UNARY_OPERATOR}),
        {},
    ),
    ...BINARY_OPERATORS.reduce(
        (acc, op) => ({...acc, [op]: TokenType.BINARY_OPERATOR}),
        {},
    ),
    ...KEYWORDS.reduce(
        (acc, keyword) => ({...acc, [keyword]: TokenType.KEYWORD}),
        {},
    ),
});

/**
 * @type {Readonly<string[]>}
 */
export const SLICES_SORTED = Object.freeze(
    Object.keys(SLICES_TO_TOKEN_TYPE).sort((a, b) => a.length < b.length ? 1 : -1)
);

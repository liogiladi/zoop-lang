"use strict";

import {ASSERT, clamp, ErrorType, isNum, raiseError} from "../utils.js";
import {
    CHAR_TO_TOKEN_TYPE,
    DATA_TYPES, SLICES_SORTED, SLICES_TO_TOKEN_TYPE,
    Token,
    TokenType,
    UNARY_OPERATORS,
    validVariableId
} from "./tokens.js";

/**
 * @implements {Assertable}
 */
export default class Lexer {
    /** @type {Token[]} **/
    #tokens;
    /** @type {Position} **/
    #position;
    /** @type {number} **/
    #currentCharIndex;

    /**
     * @readonly
     * @type {string}
     */
    #code;

    /**
     * @param {string} code
     */
    constructor(code) {
        this.#code = code;
        this.#tokens = [];
        this.#position = [1, 0];
        this.#currentCharIndex = 0;
    }

    /**
     * @returns {Token[]}
     */
    tokenize() {
        while (this.#currentCharIndex < this.#code.length) {
            const char = this.#code[this.#currentCharIndex];
            /** @type {symbol | undefined} **/
            const charTokenType = CHAR_TO_TOKEN_TYPE[char];

            switch (charTokenType) {
                case TokenType.NONE:
                    const previousToken = this.#tokens.at(-1);

                    this.#assert(
                        !UNARY_OPERATORS.filter((o) => o !== "-").includes(previousToken?.lexeme),
                        `Prefix unary operator '${previousToken?.lexeme}' must be adjacent to its operands`,
                    );

                    this.#forward();
                    continue;
                case TokenType.NEW_LINE:
                    this.#newLine();
                    continue;
                case TokenType.VARIABLE:
                    this.#variable();
                    continue;
                case TokenType.COLON:
                    this.#type();
                    continue;
            }

            if (charTokenType) {
                this.#tokens.push(
                    Token.init({
                        type: charTokenType,
                        lexeme: char,
                        position: [...this.#position],
                        absPosition: this.#currentCharIndex,
                    }),
                );
                this.#forward();
            } else if (char === '"' || char === "`") {
                this.#literalRange(char);
            } else if (isNum(char)) {
                this.#number();
            } else if (/[tf]/.test(char) && this.#bool()) {
            } else if (this.#code.slice(this.#currentCharIndex, this.#currentCharIndex + 3) === "--*") {
                this.#blockComment();
            } else if (this.#code.slice(this.#currentCharIndex, this.#currentCharIndex + 2) === "--") {
                this.#comment();
            } else if (this.#slice()) {
            } else {
                raiseError(this.#code, "Invalid syntax", this.#position);
            }
        }

        return this.#tokens;
    }

    /**
     * @param {unknown} value
     * @param {string} error
     */
    #assert(value, error) {
        return ASSERT(
            value,
            [ErrorType.SyntaxError, error],
            this.#code,
            this.#position,
        );
    }

    #forward(times = 1) {
        this.#currentCharIndex += times;
        this.#position[1] += times;
    }

    #newLine() {
        this.#tokens.push(
            Token.init({
                type: TokenType.NEW_LINE,
                lexeme: "\n",
                position: [...this.#position],
                absPosition: this.#currentCharIndex,
            }),
        );
        this.#position[0]++;
        this.#position[1] = 0;
        this.#currentCharIndex++;
    }

    #variable() {
        const mutableLexeme = this.#code[this.#currentCharIndex];
        let id = "";

        this.#forward();

        while (
            /^[a-zA-Z\d]+$/.test(this.#code[this.#currentCharIndex]) &&
            this.#currentCharIndex < this.#code.length
            ) {
            id += this.#code[this.#currentCharIndex];
            this.#assert(validVariableId(id), "Invalid identifier");
            this.#forward();
        }

        this.#tokens.push(
            Token.init({
                type: TokenType.VARIABLE,
                lexeme: `${mutableLexeme}${id}`,
                value: id,
                position: [...this.#position],
                absPosition: this.#currentCharIndex,
            }),
        );
    }

    #type() {
        this.#tokens.push(
            Token.init({
                type: TokenType.COLON,
                lexeme: ":",
                position: [...this.#position],
                absPosition: this.#currentCharIndex,
            }),
        );

        this.#forward();

        const type = DATA_TYPES.find((t) =>
            t ===
            this.#code.slice(
                this.#currentCharIndex,
                this.#currentCharIndex + t.length,
            )
        );

        this.#assert(
            type,
            `${
                [" ", "\n"].includes(this.#code?.[this.#currentCharIndex])
                    ? "Missing"
                    : "Invalid"
            } data type`,
        );

        this.#tokens.push(
            Token.init({
                type: TokenType.KEYWORD,
                lexeme: type,
                position: [...this.#position],
                absPosition: this.#currentCharIndex,
            }),
        );
        this.#forward(type.length);
    }

    /**
     * @param {'"' | "`"} char
     */
    #literalRange(char) {
        let lexeme = char;
        /** @type {Position} **/
        const position = [...this.#position];
        const startI = this.#currentCharIndex;

        this.#forward();

        do {
            lexeme += this.#code[this.#currentCharIndex];
            this.#forward();

            if (lexeme.endsWith(char)) break;
        } while (this.#currentCharIndex < this.#code.length);

        if (
            this.#currentCharIndex > this.#code.length || !lexeme.endsWith(char)
        ) {
            this.#position[1] = startI;
            raiseError(this.#code, "Unclosed string", this.#position);
        }

        this.#tokens.push(
            Token.init({
                type: TokenType.LITERAL,
                lexeme: lexeme,
                value: lexeme.slice(1, -1),
                position,
                absPosition: this.#currentCharIndex,
            }),
        );
    }

    #number() {
        let lexeme = this.#code[this.#currentCharIndex];
        /** @type {Position} **/
        const position = [...this.#position];

        this.#forward();

        while (
            (isNum(this.#code[this.#currentCharIndex]) ||
                this.#code[this.#currentCharIndex] === ".") &&
            !["\r", "\n"].includes(this.#code[this.#currentCharIndex]) &&
            this.#currentCharIndex < this.#code.length
            ) {
            lexeme += this.#code[this.#currentCharIndex];
            this.#assert(isNum(lexeme), "Invalid number literal");

            this.#forward();
        }

        if (this.#code[this.#currentCharIndex] === "u") {
            lexeme += this.#code[this.#currentCharIndex];
            this.#forward();
        }

        this.#tokens.push(
            Token.init({
                type: TokenType.LITERAL,
                lexeme,
                value: Number.parseFloat(lexeme),
                position,
                absPosition: this.#currentCharIndex,
            }),
        );
    }

    /**
     * @returns {boolean}
     */
    #bool() {
        const boolValue = this.#code.slice(
            this.#currentCharIndex,
            this.#currentCharIndex + 4,
        ) === "true"
            ? true
            : this.#code.slice(
                this.#currentCharIndex,
                this.#currentCharIndex + 5,
            ) === "false"
                ? false
                : null;

        if (boolValue !== null) {
            const lexeme = boolValue + "";

            this.#tokens.push(
                Token.init({
                    type: TokenType.LITERAL,
                    lexeme,
                    value: boolValue,
                    position: [...this.#position],
                    absPosition: this.#currentCharIndex,
                }),
            );

            this.#forward(lexeme.length);
            return true;
        }

        return false;
    }

    #blockComment() {
        /** @type {Position} **/
        const position = [...this.#position];
        const absPosition = this.#currentCharIndex;
        this.#forward(2);

        let value = "";

        while (
            this.#code.slice(
                this.#currentCharIndex,
                this.#currentCharIndex + 3,
            ) !== "*--" &&
            this.#currentCharIndex < this.#code.length
            ) {
            value += this.#code[this.#currentCharIndex];

            if (this.#code[this.#currentCharIndex] === "\n") this.#position[0]++;
            this.#forward();
        }

        this.#assert(
            this.#currentCharIndex < this.#code.length,
            "Unclosed block comment",
        );

        this.#forward();
        this.#forward();
        this.#forward();

        this.#tokens.push(
            Token.init({
                type: TokenType.BLOCK_COMMENT,
                lexeme: `--*${value}*--`,
                value,
                position,
                absPosition,
            }),
        );
    }

    #comment() {
        /** @type {Position} **/
        const position = [...this.#position];
        const absPosition = this.#currentCharIndex;
        this.#forward(2);

        let value = "";

        while (
            !["\n", "\x00"].includes(this.#code[this.#currentCharIndex]) &&
            this.#currentCharIndex < this.#code.length
            ) {
            value += this.#code[this.#currentCharIndex];
            this.#forward();
        }

        this.#tokens.push(
            Token.init({
                type: TokenType.COMMENT,
                lexeme: `--${value}`,
                value,
                position,
                absPosition,
            }),
        );
    }

    /**
     * @returns {boolean}
     */
    #slice() {

        const slice = SLICES_SORTED.find(
            (x) =>
                x ===
                this.#code.slice(
                    this.#currentCharIndex,
                    this.#currentCharIndex + x.length,
                ),
        );

        if (slice) {
            const type = SLICES_TO_TOKEN_TYPE[slice];

            // Errors
            if (type === TokenType.FLOW_IN) {
                const variableDeclaration =
                    this.#tokens.at(-1)?.type === TokenType.KEYWORD &&
                    this.#tokens.at(-2)?.type === TokenType.COLON &&
                    this.#tokens.at(-3)?.type === TokenType.VARIABLE;

                const zoopDeclaration =
                    this.#tokens.at(-1)?.type === TokenType.LITERAL &&
                    /^`.+`$/g.test(this.#tokens.at(-1)?.lexeme || "") &&
                    ((this.#tokens.at(-2)?.lexeme === "zoop") ||
                        (
                            this.#tokens.at(-2)?.type === TokenType.KEYWORD &&
                            this.#tokens.at(-3)?.type === TokenType.COLON &&
                            this.#tokens.at(-4)?.lexeme === "zoop"
                        ));

                this.#assert(
                    this.#tokens.at(-1)?.type === TokenType.VARIABLE ||
                    variableDeclaration || zoopDeclaration,
                    "Flow In ('<-') must be to a variable or a zoop declaration only",
                );
            }

            /** @type {Position} **/
            const position = [...this.#position];
            position[1] = Math.max(0, position[1] - slice.length - 1);

            this.#tokens.push(
                Token.init({
                    type: SLICES_TO_TOKEN_TYPE[slice],
                    lexeme: slice,
                    position,
                    absPosition: this.#currentCharIndex,
                }),
            );

            this.#forward(slice.length);
            return true;
        }

        return false;
    }
}

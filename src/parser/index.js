"use strict";

import {ASSERT, ErrorType, includes, raiseError} from "../utils.js";
import {
    BINARY_OPERATORS,
    DATA_TYPES,
    Token,
    TokenType,
    UNARY_OPERATORS,
    validVariableId,
} from "../lexer/tokens.js";
import {
    BinaryExpr,
    CastingExpr,
    DeclarationExpr,
    DeExpr,
    Expr,
    GroupingExpr,
    InputExpr,
    Literal,
    LiteralExpr,
    ReassignmentExpr,
    UnaryExpr,
    VariableExpr,
} from "./expressions.js";
import Program from "./programTree.js";
import {
    ConditionBranch,
    ConditionStmt, EndStmt,
    ExprStmt, LoopStmt,
    Param,
    PrintStmt,
    ReturnStmt,
    ScopeBlockStmt,
    Stmt,
    ZoopStmt,
} from "./statements.js";

/**
 * @implements {Assertable}
 */
export class Parser {
    /** @type {string} */
    #code;
    /** @type {Token[]} */
    #tokens;
    /** @type {number} */
    #currentTokenIndex;
    #loopNestings = 0;

    /**
     * @param {string} code
     * @param {Token[]} tokens
     */
    constructor(code, tokens) {
        this.currentTokenIndex = 0;
        this.#code = code;
        this.#tokens = tokens;
    }

    /**
     * @returns {Program}
     */
    parse() {
        const program = new Program();

        while (this.currentTokenIndex < this.#tokens.length) {
            if (![TokenType.NEW_LINE, TokenType.COMMENT, TokenType.BLOCK_COMMENT].includes(this.#at(0)?.type)) {
                const stmt = this.#statement();
                program.body.push(stmt);
            } else this.#skip(1);
        }

        return program;
    }

    /**
     * @param {unknown} value
     * @param {string} error
     * @param {Position} [pos]
     * @return {never}
     */
    #assert(value, error, pos) {
        return ASSERT(
            value,
            [ErrorType.SyntaxError, error],
            this.#code,
            pos || this.#at(0)?.position || this.#tokens.at(-1)?.position || [0, 0],
        );
    }

    #forward() {
        return this.#tokens[this.currentTokenIndex++];
    }

    /**
     * @param {number} times
     */
    #skip(times) {
        this.currentTokenIndex += times;
    }

    /**
     * @param {string | symbol} expectedValue
     * @param {string} error
     */
    #consume(expectedValue, error) {
        const value = this.#forward();
        this.#assert(
            typeof expectedValue === "string"
                ? expectedValue === value.lexeme
                : expectedValue === value.type,
            error,
            value.position,
        );
    }

    /**
     * @param {number} index
     * @returns {Token | undefined}
     */
    #at(index) {
        return this.#tokens.at(this.currentTokenIndex + index);
    }

    /**
     * @param {...string} lexemes
     * @returns {boolean}
     */
    #match(...lexemes) {
        for (const lexeme of lexemes) {
            if (this.#tokens[this.currentTokenIndex]?.lexeme === lexeme) {
                this.#skip(1);
                return true;
            }
        }

        return false;
    }

    /**
     * @param {...symbol} tokenTypes
     * @returns {boolean}
     */
    #checkSequence(...tokenTypes) {
        return tokenTypes.every((type, i) => {
            return this.#at(i)?.type === type;
        });
    }

    /**
     * @returns {Stmt}
     */
    #statement() {
        if (this.#match("{")) {
            return this.#scopeBlock();
        }

        if (this.#match("zoop")) {
            return this.#zoop();
        }

        if (this.#match("if")) {
            return this.#condition();
        }

        if (this.#match("loop")) {
            return this.#loop();
        }

        if (this.#match("end")) {
            this.#assert(this.#loopNestings !== 0, "End statements can be used only inside loops", this.#at(-1).position)
            return new EndStmt(this.#at(-1).position);
        }

        if (this.#match("->")) {
            return new ReturnStmt(this.#at(-1).position);
        }

        this.#assert(!this.#match("de"), "de operator must follow a label");

        this.#assert(
            !this.#match("zoop"),
            "Zoops can only be declared in the global scope",
        );

        const firstNewLineOccurrence = this.#tokens.slice(this.currentTokenIndex)
            .findIndex((t) => t.type === TokenType.NEW_LINE);

        const firstPrintOccurrence = this.#tokens.slice(
            this.currentTokenIndex,
            firstNewLineOccurrence === -1
                ? this.#tokens.length
                : this.currentTokenIndex + firstNewLineOccurrence,
        )
            .findIndex((t) => t.type === TokenType.OUTPUT);

        const firstReturnOccurrence = this.#tokens.slice(
            this.currentTokenIndex,
            firstNewLineOccurrence === -1
                ? this.#tokens.length
                : this.currentTokenIndex + firstNewLineOccurrence,
        )
            .findIndex((t) => t.type === TokenType.FLOW_OUT);

        this.#assert(
            (firstPrintOccurrence === -1 &&
                firstReturnOccurrence === -1) ||
            (firstReturnOccurrence !== firstPrintOccurrence),
            "Cannot print and return at the same time",
            this.#tokens[firstReturnOccurrence]?.position,
        );

        this.#assert(
            firstPrintOccurrence === -1 ||
            this.currentTokenIndex + firstPrintOccurrence ===
            this.#tokens.length - 1 ||
            this.#at(firstPrintOccurrence + 1)?.type ===
            TokenType.NEW_LINE,
            "Print operator can only be used once at the end of a line",
            this.#at(firstPrintOccurrence)?.position,
        );

        this.#assert(
            firstReturnOccurrence === -1 ||
            this.currentTokenIndex + firstReturnOccurrence ===
            this.#tokens.length - 1 ||
            this.#at(firstReturnOccurrence + 1)?.type ===
            TokenType.NEW_LINE,
            "Flow Out operator ('->') can only be used once at the end of a line",
            this.#at(firstReturnOccurrence)?.position,
        );

        if (firstPrintOccurrence !== -1) {
            const expr = this.#expression();
            const printToken = this.#forward();
            return new PrintStmt(expr, printToken.position);
        }

        if (firstReturnOccurrence !== -1) {
            const expr = this.#expression();
            const returnToken = this.#forward();
            return new ReturnStmt(returnToken.position, expr);
        }

        const expr = this.#expression();

        return new ExprStmt(expr);
    }

    /**
     * @returns {ScopeBlockStmt}
     */
    #scopeBlock() {

        const pos = this.#at(-1).position;
        /** @type {Stmt[]} */
        const statements = [];

        while (!this.#match("}") && this.currentTokenIndex < this.#tokens.length - 1) {
            if (this.#at(0)?.type === TokenType.COMMENT) {
                this.#skip(1);
            } else if (!this.#match("\n")) {
                statements.push(this.#statement());
            }
        }

        return new ScopeBlockStmt(statements, pos);
    }

    /**
     * @returns {ConditionStmt}
     */
    #condition() {
        // If condition
        const stmtPosition = [...this.#at(-1).position];
        const expression = this.#expression();

        /** @type {Stmt[]} */
        const thenStatements = [];

        if (this.#match("=>")) {
            thenStatements.push(this.#statement());
            this.#skip(1);
        } else {
            while (
                !this.#match("end if") &&
                this.currentTokenIndex < this.#tokens.length - 1
                ) {
                if (this.#at(0)?.type === TokenType.COMMENT) {
                    this.#skip(1);
                } else if (!this.#match("\n")) {
                    thenStatements.push(this.#statement());
                }
            }

            this.#assert(
                (this.#at(-1)?.lexeme) === "end if",
                "Expected 'end if' to close if block",
                stmtPosition
            );

            if (this.currentTokenIndex < this.#tokens.length - 1) {
                this.#consume(
                    TokenType.NEW_LINE,
                    "Expected a new line after if block",
                );
            }
        }

        // Elif conditions
        /** @type {ConditionBranch[]} */
        const elifConditions = [];

        while (
            this.#match("elif") &&
            this.currentTokenIndex < this.#tokens.length - 1
            ) {
            const position = this.#at(-1).position;
            const expression = this.#expression();
            /** @type {Stmt[]} */
            const elifStatements = [];

            if (this.#match("=>")) {
                elifStatements.push(this.#statement());
                this.#skip(1);
            } else {
                while (
                    !this.#match("end elif") &&
                    this.currentTokenIndex < this.#tokens.length - 1
                    ) {
                    if (this.#at(0)?.type === TokenType.COMMENT) {
                        this.#skip(1);
                    } else if (!this.#match("\n")) {
                        elifStatements.push(this.#statement());
                    }
                }

                this.#assert(
                    this.#at(-1)?.lexeme === "end elif",
                    "Expected 'end elif' to close elif block",
                    position
                );

                if (this.currentTokenIndex < this.#tokens.length - 1) {
                    this.#consume(
                        TokenType.NEW_LINE,
                        "Expected a new line after elif block",
                    );
                }
            }

            elifConditions.push(
                new ConditionBranch(expression, elifStatements, position),
            );
        }

        // Else condition
        /** @type {Stmt[]} */
        const elseStatements = [];

        if (this.#match("else")) {
            const position = this.#at(-1).position;
            if (this.#match("=>")) {
                elseStatements.push(this.#statement());
                this.#skip(1);
            } else {
                while (
                    !this.#match("end else") &&
                    this.currentTokenIndex < this.#tokens.length - 1
                    ) {
                    if (this.#at(0)?.type === TokenType.COMMENT) {
                        this.#skip(1);
                    } else if (!this.#match("\n")) {
                        elseStatements.push(this.#statement());
                    }
                }

                this.#assert(
                    this.#at(-1)?.lexeme === "end else",
                    "Expected 'end else' to close else block",
                    position
                );

                if (this.currentTokenIndex < this.#tokens.length - 1) {
                    this.#consume(
                        TokenType.NEW_LINE,
                        "Expected a new line after else block",
                    );
                }
            }
        }

        return new ConditionStmt(
            new ConditionBranch(expression, thenStatements, stmtPosition),
            stmtPosition,
            elifConditions,
            elseStatements,
        );
    }

    /**
     * @returns {ZoopStmt}
     */
    #zoop() {
        /** @type {Position} */
        const position = [...this.#at(-1).position];
        /** @type {DataType | undefined} */
        let type;

        if (this.#match(":")) {
            const typeToken = this.#forward();

            this.#assert(
                typeToken &&
                DATA_TYPES.includes(typeToken.lexeme),
                "Invalid data type for zoop",
            );
            type = /** @type {DataType} */ typeToken.lexeme;
        }

        const labelToken = this.#forward();
        this.#assert(
            labelToken.value && labelToken.lexeme[0] === "`" &&
            labelToken.lexeme.at(-1) === "`",
            "Invalid label for zoop",
            this.#at(-2)?.position,
        );

        const label = new Literal("label", labelToken.value);

        this.#consume(
            TokenType.FLOW_IN,
            "Expected a '<-' after zoop declaration's label ",
        );

        /** @type {Param[]} */
        const parameters = [];

        while (
            !this.#match("=>", "{", "\n") &&
            this.currentTokenIndex < this.#tokens.length - 1
            ) {
            if (this.#at(0)?.type === TokenType.COMMENT) {
                this.#skip(1);
            } else {
                const identifier = this.#forward();
                this.#assert(
                    identifier && identifier.type === TokenType.VARIABLE &&
                    validVariableId(identifier.lexeme.slice(1)),
                    "Invalid parameter identifier",
                );
                this.#assert(
                    identifier.lexeme.startsWith("$"),
                    "Zoop parameters must be immutables",
                );

                this.#consume(":", "Expected ':' after parameter name");

                const paramType = this.#forward();
                this.#assert(
                    includes(DATA_TYPES, paramType.lexeme),
                    "Invalid data type for zoop",
                );

                parameters.push(
                    new Param(identifier.lexeme.slice(1), paramType.lexeme),
                );
            }
        }

        this.currentTokenIndex--;

        /** @type {Stmt[]} */
        const statements = [];

        if (this.#match("=>")) {
            statements.push(this.#statement());
            this.#skip(1);
        } else {
            while (
                !this.#match("end zoop") &&
                this.currentTokenIndex < this.#tokens.length - 1
                ) {
                if (this.#at(0)?.type === TokenType.COMMENT) {
                    this.#skip(1);
                } else if (!this.#match("\n")) {
                    statements.push(this.#statement());
                }
            }

            this.#assert(
                this.#at(-1)?.lexeme === "end zoop",
                "Expected 'end zoop' to close zoop block",
                this.#at(-1)?.position,
            );

            if (this.currentTokenIndex < this.#tokens.length - 1) {
                this.#consume(
                    TokenType.NEW_LINE,
                    "Expected a new line after zoop block",
                );
            }
        }

        return new ZoopStmt(label, parameters, statements, position, type);
    }

    /**
     * @returns {LoopStmt}
     */
    #loop() {
        /** @type {Position} */
        const position = [...this.#at(-1).position];
        /** @type {Stmt[]} */
        const statements = [];

        this.#loopNestings++;

        if (this.#match("=>")) {
            statements.push(this.#statement());
            this.#skip(1);
        } else {
            while (!this.#match("end loop") && this.currentTokenIndex < this.#tokens.length - 1) {
                if (this.#at(0)?.type === TokenType.COMMENT) {
                    this.#skip(1);
                } else if (!this.#match("\n")) {
                    statements.push(this.#statement());
                }
            }

            this.#assert(
                this.#at(-1)?.lexeme === "end loop",
                "Expected 'end loop' to close loop block",
                position,
            );

            if (this.currentTokenIndex < this.#tokens.length - 1) {
                this.#consume(
                    TokenType.NEW_LINE,
                    "Expected a new line after loop block",
                );
            }
        }

        this.#loopNestings--;

        return new LoopStmt(statements, position);
    }

    /**
     * @param {BinaryOperator[]} operators
     * @param {() => Expr} nextPrecedence
     * @returns {Expr}
     */
    #binaryPrecedence(operators, nextPrecedence) {
        let expr = nextPrecedence();

        while (this.#match(...operators)) {
            const operator = this.#at(-1);
            const right = nextPrecedence();
            expr = new BinaryExpr(expr, operator, right, expr.position);
        }

        return expr;
    }

    /**
     * @returns {Expr}
     */
    #expression() {
        return this.#concat();
    }

    /**
     * @returns {Expr}
     */
    #concat() {
        return this.#binaryPrecedence(["_"], this.#logic.bind(this));
    }

    /**
     * @returns {Expr}
     */
    #logic() {
        return this.#binaryPrecedence(["&", "|"], this.#equality.bind(this));
    }

    /**
     * @returns {Expr}
     */
    #equality() {
        return this.#binaryPrecedence(["~=", "="], this.#comparison.bind(this));
    }

    /**
     * @returns {Expr}
     */
    #comparison() {
        return this.#binaryPrecedence(
            [">", ">=", "<", "<="],
            this.#term.bind(this),
        );
    }

    /**
     * @returns {Expr}
     */
    #term() {
        return this.#binaryPrecedence(["+", "-"], this.#factor.bind(this));
    }

    /**
     * @returns {Expr}
     */
    #factor() {
        return this.#binaryPrecedence(["*", "/"], this.#unary.bind(this));
    }

    /**
     * @returns {UnaryExpr|*}
     */
    #unary() {
        if (
            UNARY_OPERATORS.includes(this.#at(0)?.lexeme || "") &&
            this.#code[this.#at(0).absPosition + 1] !== " " &&
            ![...UNARY_OPERATORS, ...BINARY_OPERATORS].includes(this.#code[this.#at(0).absPosition - 1])
        ) {
            const operator = this.#at(0);
            this.#skip(1);

            return new UnaryExpr(operator, this.#unary(), operator.position);
        } else return this.#cast();
    }

    /**
     * @returns {Expr}
     */
    #cast() {
        let expr = this.#primary();

        while (
            this.#at(0)?.lexeme === "~" &&
            DATA_TYPES.includes(this.#at(1)?.lexeme)
            ) {
            const typeToken = this.#at(1);

            this.#assert(
                typeToken && includes(DATA_TYPES, typeToken?.lexeme),
                "Internal, type in casting must be in TYPES",
            );

            expr = new CastingExpr(
                expr,
                typeToken.lexeme,
                typeToken.position,
            );

            this.#skip(2);
        }

        return expr;
    }

    /**
     * @returns {Expr}
     */
    #primary() {
        const token = this.#forward();

        if (token?.type === TokenType.LITERAL) {
            if (token.value === undefined) {
                throw new Error("Literal Token must contain a value " + token);
            }

            const literal = new LiteralExpr(
                Literal.fromToken(token),
                token.position,
            );

            if (literal.info.type === "label" && this.#match("de")) {
                return this.#de();
            }

            return literal;
        }

        if (
            token.type === TokenType.INPUT &&
            this.#checkSequence(TokenType.COLON, TokenType.KEYWORD)
        ) {
            const dataType = this.#at(1);
            this.#assert(
                dataType && includes(DATA_TYPES, dataType?.lexeme),
                "Invalid data type",
                dataType?.position,
            );

            this.#skip(2);

            let label = "";
            if (this.#at(0)?.lexeme.startsWith("`")) {
                label = this.#at(0).value + "";
                this.#skip(1);
            }

            return new InputExpr(dataType.lexeme, token.position, label);
        }

        if (token?.type === TokenType.INPUT) {
            let label = "";
            if (this.#at(0)?.lexeme.startsWith("`")) {
                label = this.#at(0).value + "";
                this.#skip(1);
            }

            return new InputExpr("string", token.position, label);
        }

        if (
            token.type === TokenType.VARIABLE &&
            this.#checkSequence(TokenType.FLOW_IN) ||
            this.#checkSequence(
                TokenType.COLON,
                TokenType.KEYWORD,
                TokenType.FLOW_IN,
            )
        ) {
            return this.assignment();
        }

        if (token.type === TokenType.VARIABLE) {
            return new VariableExpr(
                token.lexeme[0] === "@",
                token.value + "",
                token.position,
            );
        }

        if (token?.type === TokenType.PARAN_OPEN) {
            const expr = this.#expression();

            if (this.#forward()?.type !== TokenType.PARAN_CLOSE) {
                raiseError(
                    this.#code,
                    "Expect ')' after expression.",
                    this.#at(-1).position,
                );
            }

            return new GroupingExpr(expr, token.position);
        }

        raiseError(this.#code, "Invalid expression", token?.position);
    }

    /**
     * @returns {Expr}
     */
    assignment() {
        /** @type {Expr | null} */
        let expr = null;

        this.currentTokenIndex--;

        const match = () => {
            return (
                this.#checkSequence(TokenType.VARIABLE, TokenType.FLOW_IN)
                    ? this.#tokens.slice(
                        this.currentTokenIndex,
                        this.currentTokenIndex + 2,
                    )
                    : this.#checkSequence(
                        TokenType.VARIABLE,
                        TokenType.COLON,
                        TokenType.KEYWORD,
                        TokenType.FLOW_IN,
                    )
                        ? this.#tokens.slice(
                            this.currentTokenIndex,
                            this.currentTokenIndex + 4,
                        )
                        : null
            );
        };

        let matchedTokens = match();
        const initialMatchedTokens = matchedTokens;

        this.#assert(
            initialMatchedTokens,
            "Variable assignment must be of the form <@|$>identifier(:<type>) <- EXPRESSION",
        );

        while (matchedTokens) {
            this.#skip(matchedTokens.length);

            // Declaration
            if (matchedTokens.length === 4) {
                expr = new DeclarationExpr(
                    matchedTokens[0].lexeme.charAt(0) === "@",
                    matchedTokens[0].lexeme.slice(1),
                    matchedTokens[2].lexeme,
                    this.#expression(),
                    matchedTokens[0].position,
                );
            } // Reassignment
            else {
                if (matchedTokens[0].lexeme.charAt(0) === "$") {
                    raiseError(
                        this.#code,
                        "Immutable cannot be reassigned",
                        matchedTokens[0].position,
                    );
                }

                expr = new ReassignmentExpr(
                    matchedTokens[0].lexeme.slice(1),
                    this.#expression(),
                    matchedTokens[0].position,
                );
            }

            matchedTokens = match();
        }

        this.#assert(
            expr,
            "Assignment expression must be defined",
            initialMatchedTokens.at(-1)?.position,
        );

        return expr;
    }

    /**
     * @returns {DeExpr}
     */
    #de() {
        const labelToken = this.#at(-2);

        this.#assert(
            labelToken && labelToken.type === TokenType.LITERAL &&
            /^`.+`$/.test(labelToken.lexeme + ""),
            "You must use a label to zoop de arguments",
            labelToken?.position,
        );

        /** @type {Expr[]} */
        const args = [];

        while (!this.#match("\n", ")", "->|", "->") && this.currentTokenIndex <= this.#tokens.length - 1) {
            if (this.#at(0)?.type === TokenType.COMMENT) break;
            else {
                const expr = this.#expression();

                args.push(
                    expr,
                );
            }
        }

        if ([")", "->|", "->"].includes(this.#at(-1)?.lexeme || "")) {
            this.currentTokenIndex -= 1;
        }

        /** @type {Position} */
        const pos = [...labelToken.position];
        //TODO: pos[1] -= labelToken.lexeme.length;

        return new DeExpr(Literal.fromToken(labelToken), args, pos);
    }
}

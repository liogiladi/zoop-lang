"use strict";

import {
    ASSERT,
    clamp,
    ErrorType,
    includes, matchNumberValueWithType,
    raiseError,
} from "../utils.js";
import Lexer from "../lexer/index.js";
import {
    BINARY_OPERATORS,
    COMPARE_OPERATORS,
    LOGIC_OPERATORS,
    MATH_OPERATORS,
    NUMERIC_TYPES,
    UNARY_OPERATORS,
} from "../lexer/tokens.js";
import {Parser} from "../parser/index.js";
import {
    ConditionStmt, EndStmt,
    ExprStmt, LoopStmt,
    Param,
    PrintStmt,
    ReturnStmt,
    ScopeBlockStmt,
    Stmt,
    ZoopStmt,
} from "../parser/statements.js";
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
    ReturnLiteral,
    ReassignmentExpr,
    UnaryExpr,
    VariableExpr, EndLiteral,
} from "../parser/expressions.js";
import {GlobalScope, InnerScope} from "./scope.js";

import promptSync from "prompt-sync";

const prompt = promptSync({sigint: true});

/**
 * @implements {Assertable}
 */
export default class Interpreter {
    /** @type {string} */
    #code;
    /** @type {Program} */
    #program;
    /** @type {GlobalScope} */
    #globalScope;
    /** @type {InnerScope | GlobalScope} */
    #currentScope;

    /**
     * @param {string} code
     * @param {DebugOptions} [DEBUG]
     */
    constructor(code, DEBUG) {
        this.#code = code
            .replaceAll("\x00", "")
            .replace(/(\r\n)|(\r)/g, "\n");

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        if (DEBUG?.includes("lexer")) console.log(tokens);

        const parser = new Parser(code, tokens);
        this.#program = parser.parse();

        if (DEBUG?.includes("parser")) console.log(this.#program.pretty());

        this.#globalScope = new GlobalScope();
        this.#currentScope = this.#globalScope;
    }

    run() {
        for (const declr of this.#program.body) {
            this.#statement(declr);
        }
    }

    /**
     * @param {unknown} value
     * @param {string} error
     * @param {Position} position
     * @return {never}
     */
    #assert(value, error, position) {
        return ASSERT(
            value,
            [ErrorType.RuntimeError, error],
            this.#code,
            position,
        );
    }

    /**
     * @param {Stmt} stmt
     * @return {undefined | Literal}
     */
    #statement(stmt) {
        if (stmt instanceof PrintStmt) this.#print(stmt);
        else if (stmt instanceof ExprStmt) this.#expression(stmt);
        else if (stmt instanceof ScopeBlockStmt) return this.#scopeBlock(stmt);
        else if (stmt instanceof ConditionStmt) return this.#condition(stmt);
        else if (stmt instanceof ZoopStmt) this.#zoop(stmt);

        else if (stmt instanceof ReturnStmt) {
            return stmt.expression
                ? this.#evaluate(stmt.expression)
                : new ReturnLiteral();
        } else if (stmt instanceof LoopStmt) this.#loop(stmt);
        else if (stmt instanceof EndStmt) {
            return new EndLiteral();
        } else throw new Error("Unexpected stmt type");
    }

    /**
     * @param {PrintStmt} stmt
     */
    #print(stmt) {
        const literal = this.#evaluate(stmt.expression);
        this.#assert(
            !(literal instanceof ReturnLiteral),
            "Cannot print <void>",
            stmt.position,
        );
        console.log(literal.value);
    }

    /**
     * @param {ExprStmt} stmt
     */
    #expression(stmt) {
        this.#evaluate(stmt.expression);
    }

    /**
     * @param {ScopeBlockStmt} scopeBlockStmt
     * @return {undefined | Literal}
     */
    #scopeBlock(scopeBlockStmt) {
        this.#currentScope = new InnerScope(this.#currentScope, this.#globalScope);

        for (const stmt of scopeBlockStmt.statements) {
            const result = this.#statement(stmt);
            if (result) {
                this.#currentScope = this.#currentScope.parent;
                return result;
            }
        }

        this.#currentScope = this.#currentScope.parent;
    }

    /**
     * @param {ConditionStmt} conditionStmt
     * @return {undefined | Literal}
     */
    #condition(conditionStmt) {
        const {thenBranch, elifBranches, elseStatements} = conditionStmt;

        if (this.#evaluate(thenBranch.expression).value) {
            for (const stmt of thenBranch.statements) {
                const result = this.#statement(stmt);
                if (result) return result;
            }
        } else {
            let elifSucceeded = false;

            if (elifBranches && elifBranches.length > 0) {
                for (const branch of elifBranches) {
                    if (this.#evaluate(branch.expression).value) {
                        for (const stmt of branch.statements) {
                            const result = this.#statement(stmt);
                            if (result) return result;
                        }

                        elifSucceeded = true;
                        break;
                    }
                }
            }

            if (!elifSucceeded && elseStatements && elseStatements.length > 0) {
                for (const stmt of elseStatements) {
                    const result = this.#statement(stmt);
                    if (result) return result;
                }
            }
        }
    }

    /**
     * @param {ZoopStmt} stmt
     */
    #zoop(stmt) {
        const {label, parameters, statements, returnType} = stmt;

        const callback = this.#zoopCallback(parameters, statements, returnType)
            .bind(this);

        const error = this.#globalScope.defineZoopCallback(
            label.value + "",
            callback,
        );

        this.#assert(
            !error,
            error?.message || "NO ERROR OBJECT",
            stmt.position,
        );
    }

    /**
     * @param {Param[]} parameters
     * @param {Stmt[]} statements
     * @param {DataType | undefined} returnType
     * @return {ZoopCall}
     */
    #zoopCallback(parameters, statements, returnType) {
        /**
         * @param {Expr[]} args
         * @param {Position} callPosition
         * @return {undefined | Literal}
         */
        return (args, callPosition) => {
            this.#assert(
                parameters.length === args.length,
                `Expected ${parameters.length} arguments but got ${args.length}`,
                callPosition,
            );

            /** @type {ZoopContext} */
            const argsContext = new Map();

            parameters.forEach((param, i) => {
                const argLiteral = this.#evaluate(args[i]);

                this.#assert(
                    argLiteral.type === param.type,
                    `Expected argument of type <${param.type}> but got <${argLiteral.type}>`,
                    args[i].position,
                );

                argsContext.set(param.identifier, argLiteral);
            });

            const error = this.#globalScope.pushZoopContext(argsContext);
            this.#assert(!error, error?.message || "NO ERROR OBJECT", callPosition);

            for (const stmt of statements) {
                const result = this.#statement(stmt);
                if (!result) continue;
                if (result instanceof ReturnLiteral) {
                    this.#globalScope.popZoopContext();
                    return;
                }

                if (
                    result.type !== returnType ||
                    (returnType === undefined &&
                        !(result instanceof ReturnLiteral)) ||
                    (returnType !== undefined &&
                        (result instanceof ReturnLiteral))
                ) {
                    raiseError(
                        this.#code,
                        `Expected return value of type <${
                            returnType || "void"
                        }> but got <${result.type}>.`,
                        callPosition,
                    );
                }

                this.#globalScope.popZoopContext();
                return result;
            }
        };
    }

    /**
     * @param {LoopStmt} stmt
     */
    #loop(stmt) {
        const {statements, position} = stmt;

        while (true) {
            for (const stmt of statements) {
                const result = this.#statement(stmt);
                if (!result) continue;
                if (result instanceof EndLiteral) {
                    return;
                }
                if (result instanceof ReturnLiteral) {
                    return result;
                }

                raiseError(this.#code, "Unknown result in loop statement", position);
            }
        }
    }

    /* ----------------------------- Expressions ----------------------------- */

    /**
     * @param {Expr} expr
     * @return {Literal}
     */
    #evaluate(expr) {
        if (expr instanceof LiteralExpr) {
            return new Literal(expr.info.type, expr.info.value);
        }
        if (expr instanceof VariableExpr) {
            return this.#variable(expr);
        }
        if (expr instanceof ReassignmentExpr) {
            return this.#assignVariable(expr);
        }
        if (expr instanceof DeclarationExpr) {
            return this.#defineVariable(expr);
        }
        if (expr instanceof GroupingExpr) {
            return this.#evaluate(expr.expression);
        }
        if (expr instanceof UnaryExpr) {
            return this.#unaryOperation(expr);
        }
        if (expr instanceof BinaryExpr) {
            return this.#binaryOperation(expr);
        }
        if (expr instanceof CastingExpr) {
            return this.#casting(expr);
        }
        if (expr instanceof InputExpr) {
            return this.#input(expr);
        }
        if (expr instanceof DeExpr) {
            return this.#de(expr);
        }

        throw new Error(
            "Unsupported expression type '" + expr.constructor.name + "'",
        );
    }

    /**
     * @param {UnaryExpr} expr
     * @return {Literal}
     */
    #unaryOperation(expr) {
        const operatorLexeme = expr.operator.lexeme;
        if (!includes(UNARY_OPERATORS, operatorLexeme)) {
            throw new Error(
                `operator '${operatorLexeme}' is not a valid unary operator`,
            );
        }

        /** @type {Literal} */
        const rightLiteral = this.#evaluate(expr.right);

        switch (operatorLexeme) {
            case "~": {
                this.#assert(
                    typeof rightLiteral.value === "boolean",
                    "Operand of '~' must be of type bool",
                    expr.position,
                );
                return new Literal("bool", !rightLiteral.value);
            }
            case "-":
                this.#assert(
                    typeof rightLiteral.value === "number",
                    "Operand of '~' must be of type number",
                    expr.position,
                );
                return new Literal(rightLiteral.type, -rightLiteral.value);
            default:
                throw new Error(`Unknown unary operator '${operatorLexeme}'`);
        }
    }

    /**
     * @param {BinaryExpr} expr
     * @return {Literal}
     */
    #binaryOperation(expr) {
        /** @type {string} */
        const operatorLexeme = expr.operator.lexeme;

        if (!BINARY_OPERATORS.includes(operatorLexeme)) {
            throw new Error(
                `operator '${operatorLexeme}' is not a valid binary operator`,
            );
        }

        /** @type {Literal} */
        let leftLiteral;
        /** @type {Literal} */
        let rightLiteral;

        // Evaluate the grouping expression first
        if (
            expr.left instanceof GroupingExpr ||
            !(expr.right instanceof GroupingExpr)
        ) {
            leftLiteral = this.#evaluate(expr.left);
            rightLiteral = this.#evaluate(expr.right);
        } else {
            rightLiteral = this.#evaluate(expr.right);
            leftLiteral = this.#evaluate(expr.left);
        }

        /** @type {LiteralValue} */
        const leftValue = leftLiteral.value;
        /** @type {LiteralValue} */
        const rightValue = rightLiteral.value;

        /** @type {boolean | string | number | undefined} */
        let result;
        /** @type {DataType} */
        let resultType = leftLiteral.type;

        if (
            includes(MATH_OPERATORS, operatorLexeme)
        ) {
            if (
                !(typeof leftValue === "number" &&
                    typeof rightValue === "number")
            ) {
                this.#assert(
                    typeof leftValue === "number" &&
                    typeof rightValue === "number",
                    `Operands of '${operatorLexeme}' must be numbers, got <${
                        (typeof leftValue !== "number"
                            ? leftLiteral
                            : rightLiteral).type
                    }> instead`,
                    (typeof leftValue !== "number" ? expr.left : expr.right)
                        .position,
                );
            }

            this.#assert(
                leftLiteral.type === rightLiteral.type,
                `Invalid operation '${operatorLexeme}' between <${leftLiteral.type}> and <${rightLiteral.type}>. Try casting one or the other.`,
                expr.operator.position,
            );

            switch (operatorLexeme) {
                case "+":
                    result = leftValue + rightValue;
                    break;
                case "-":
                    result = leftValue - rightValue;
                    break;
                case "*":
                    result = leftValue * rightValue;
                    break;
                case "/":
                    this.#assert(
                        rightValue !== 0,
                        "Dividing by 0 is an undefined operation, at least in the real world",
                        expr.right.position,
                    );
                    result = leftValue / rightValue;
                    resultType = "dec";
                    break;
                default:
                    throw new Error(
                        `Unknown operator '${operatorLexeme}' is not a math operator`,
                    );
            }
        } else if (includes(LOGIC_OPERATORS, operatorLexeme)) {
            this.#assert(
                typeof leftValue === "boolean" &&
                typeof rightValue === "boolean",
                `Operands of '${operatorLexeme}' must be of type <bool> , got <${
                    (typeof leftValue !== "number" ? leftLiteral : rightLiteral)
                        .type
                }> instead`,
                (typeof leftValue !== "boolean" ? expr.left : expr.right).position,
            );

            switch (operatorLexeme) {
                case "&":
                    result = leftValue && rightValue;
                    break;
                case "|":
                    result = leftValue || rightValue;
                    break;
            }
        } else if (includes(COMPARE_OPERATORS, operatorLexeme)) {
            const equality = operatorLexeme === "=" ||
                operatorLexeme === "~=";

            if (equality) {
                this.#assert(
                    leftLiteral.type === rightLiteral.type /*||
                    typeof leftValue === typeof rightValue*/,
                    `Cannot compare equality of <${leftLiteral.type}> with <${rightLiteral.type}>`,
                    expr.operator.position,
                );
            } else {
                this.#assert(typeof leftValue === "number" && typeof rightValue === "number", `Operands of '${operatorLexeme}' must be numbers, got <${
                    (typeof leftValue !== "number"
                        ? leftLiteral
                        : rightLiteral)
                        .type
                }> instead`, (typeof leftValue !== "number" ? expr.left : expr.right)
                    .position)
            }

            switch (operatorLexeme) {
                case "<=":
                    result = leftValue <= rightValue;
                    break;
                case "<":
                    result = leftValue < rightValue;
                    break;
                case ">=":
                    result = leftValue >= rightValue;
                    break;
                case ">":
                    result = leftValue > rightValue;
                    break;
                case "=":
                    result = leftValue === rightValue;
                    break;
                case "~=":
                    result = leftValue !== rightValue;
                    break;
                default:
                    throw new Error(
                        `Unknown operator '${operatorLexeme}' is not a comparison operator`,
                    );
            }
        } else if (operatorLexeme === "_") {
            result = leftValue.toString() + rightValue.toString();
            resultType = "string";
        }

        if (result === undefined) {
            throw new Error(`Unknown operator '${operatorLexeme}'`);
        }

        return this.#casting(
            new CastingExpr(
                new LiteralExpr(new Literal(resultType, result), expr.position),
                resultType,
                expr.position,
            ),
        );
    }

    /**
     * @param {CastingExpr} expr
     * @return {Literal}
     */
    #casting(expr) {
        const literal = this.#evaluate(expr.expression);

        return this.#castLiteral(literal, expr.type, expr.position);
    }

    /**
     * @param {Literal} literal
     * @param {DataType} targetType
     * @param {Position} position
     * @return {Literal}
     */
    #castLiteral(literal, targetType, position) {
        let value = literal.value;

        if (targetType === literal.type) return literal;

        switch (targetType) {
            case "int":
            case "uint":
            case "dec":
            case "udec":
                if (typeof value === "boolean") value = Number(value);
                else if (typeof value !== "number") {
                    raiseError(
                        this.#code,
                        `Cannot cast value of type <${literal.type}> to <${targetType}>`,
                        position,
                    );
                }
                break;
            case "string":
                value = "" + value;
                break;
            case "bool":
                value = Boolean(value);
                break;
            default:
                throw new Error(`Unknown type '${targetType}'`);
        }

        if (targetType.includes("int")) value = Math.trunc(value);
        if (targetType.startsWith("u")) {
            value = clamp(0, value, Number.MAX_VALUE);
        }

        return new Literal(targetType, value);
    }

    /**
     * @param {InputExpr} expr
     * @return {Literal}
     */
    #input(expr) {
        const value = prompt("<-| " + (expr.label ? `${expr.label} ` : "")) || "";
        /** @type {string | boolean | number | undefined} */
        let castedValue;

        if (expr.type !== "string") {
            switch (expr.type) {
                case "int":
                case "uint":
                case "dec":
                case "udec":
                    castedValue = Number(value);

                    this.#assert(
                        matchNumberValueWithType(castedValue, expr.type) &&
                        !isNaN(castedValue),
                        `Invalid <${expr.type}> input '${value}'`,
                        expr.position,
                    );
                    break;
                case "bool":
                    castedValue = value === "true"
                        ? true
                        : value === "false"
                            ? false
                            : undefined;
                    this.#assert(
                        castedValue === undefined,
                        `Invalid <bool> input '${value}'`,
                        expr.position,
                    );
            }
        }

        return new Literal(expr.type, castedValue || value);
    }

    /**
     * @param {VariableExpr} expr
     * @return {Literal}
     */
    #variable(expr) {
        const res = this.#currentScope?.getValue(
            expr.identifier,
            expr.mutable,
        );

        if (res instanceof Error) {
            raiseError(this.#code, res.message, expr.position);
        }

        return res;
    }

    /**
     * @param {DeclarationExpr} expr
     * @return {Literal}
     */
    #defineVariable(expr) {
        const literal = this.#evaluate(expr.expression);

        this.#assert(
            expr.type === literal.type,
            `Cannot assign <${literal.type}> to variable '${expr.getLexeme()}' of type <${expr.type}>`,
            expr.expression.position,
        );

        const error = this.#currentScope.defineVariable(
            expr.identifier,
            literal,
            expr.mutable,
        );
        this.#assert(!error, error?.message || "NO ERROR OBJECT", expr.position);

        return literal;
    }

    /**
     * @param {ReassignmentExpr} expr
     * @return {Literal}
     */
    #assignVariable(expr) {
        const lookupRes = this.#currentScope.getValue(expr.identifier, true);
        this.#assert(
            !(lookupRes instanceof Error),
            lookupRes?.message || "NO ERROR OBJECT",
            expr.position,
        );

        let literal = this.#evaluate(expr.expression);

        if (lookupRes.type !== literal.type) {
            this.#assert(
                NUMERIC_TYPES.includes(lookupRes.type) &&
                NUMERIC_TYPES.includes(literal.type),
                `Cannot assign <${literal.type}> to variable '@${expr.identifier}' of type <${lookupRes.type}>`,
                expr.expression.position,
            );

            literal = this.#castLiteral(literal, lookupRes.type, expr.position);
        }

        const error = this.#currentScope.assignVariable(
            expr.identifier,
            literal,
        );
        this.#assert(!error, error?.message || "NO ERROR OBJECT", expr.position);

        return literal;
    }

    /**
     * @param {DeExpr} expr
     */
    #de(expr) {
        this.#assert(
            expr.label.type === "label" && typeof expr.label.value === "string",
            "de must be used with a zoop label",
            expr.position,
        );

        const callback = this.#globalScope.getZoopCallback(
            expr.label.value,
        );

        this.#assert(
            !(callback instanceof Error),
            callback?.message || "NO ERROR OBJECT",
            expr.position,
        );

        return callback(expr.args, expr.position) || new ReturnLiteral();
    }
}

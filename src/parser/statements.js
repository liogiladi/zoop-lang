"use strict";

import {Expr} from "./expressions.js";

export class Stmt {
    /**
     * @param {Position} position
     */
    constructor(position) {
        this.position = position
    }
}

export class ScopeBlockStmt extends Stmt {
    /**
     * @param {Stmt[]} statements
     * @param {Position} position
     */
    constructor(statements, position) {
        super(position)
        this.statements = statements
    }
}

export class ConditionBranch extends Stmt {
    /**
     * @param {Expr} expression
     * @param {Stmt[]} statements
     * @param {Position} position
     */
    constructor(expression, statements, position) {
        super(position)
        this.expression = expression
        this.statements = statements
    }
}

export class ConditionStmt extends Stmt {
    /**
     * @param {ConditionBranch} thenBranch
     * @param {Position} position
     * @param {ConditionBranch[]} [elifBranches]
     * @param {Stmt[]} [elseStatements]
     */
    constructor(thenBranch, position, elifBranches, elseStatements) {
        super(position)
        this.thenBranch = thenBranch
        this.elifBranches = elifBranches
        this.elseStatements = elseStatements
    }
}

export class ExprStmt extends Stmt {
    /**
     * @param {Expr} expression
     */
    constructor(expression) {
        super(expression.positionition)
        this.expression = expression
    }
}

export class PrintStmt extends Stmt {
    /**
     * @param {Expr} expression
     * @param {Position} position
     */
    constructor(expression, position) {
        super(position)
        this.expression = expression
    }
}

export class ZoopStmt extends Stmt {
    /**
     * @param {Literal} label
     * @param {Param[]} parameters
     * @param {Stmt[]} statements
     * @param {Position} position
     * @param {DataType} returnType
     */
    constructor(label, parameters, statements, position, returnType) {
        super(position)
        this.label = label
        this.parameters = parameters
        this.statements = statements
        this.position = position
        this.returnType = returnType
    }
}

export class ReturnStmt extends Stmt {
    /**
     * @param {Position} position
     * @param {Expr} [expression]
     */
    constructor(position, expression) {
        super(position)
        this.expression = expression
    }
}

export class Param {
    /**
     * @param {string} identifier
     * @param {DataType} type
     */
    constructor(identifier, type) {
        this.identifier = identifier
        this.type = type
    }
}

export class LoopStmt extends Stmt {
    /**
     * @param {Stmt[]} statements
     * @param {Position} position
     */
    constructor(statements, position) {
        super(position)
        this.statements = statements
        this.positionition = position
    }
}

export class EndStmt extends Stmt {}
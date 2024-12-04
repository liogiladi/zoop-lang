"use strict";

import { Stack } from "../utils.js";
import { Literal } from "../parser/expressions.js";

const MAX_ZOOP_CONTEXTS = 20;

class Scope {
    /** @type {Scope | null} */
    parent;
    /** @type {Map<string, Literal>} */
    #mutables;
    /** @type {Map<string, Literal>} */
    #immutables;

    /**
     * @param {Scope | null} parent
     */
    constructor(parent) {
        this.parent = parent;
        this.#mutables = new Map();
        this.#immutables = new Map();
    }

    /**
     * @param {string} id
     * @param {boolean} mutable
     * @returns {Literal|Error}
     */
    getValue(id, mutable) {
        if (mutable && this.#mutables.has(id)) return this.#mutables.get(id);
        if (!mutable) {
            if (this.#immutables.has(id)) return this.#immutables.get(id);
        }

        if (this.parent !== null) {
            return this.parent.getValue(id, mutable);
        }

        return new Error(`Undefined variable '${mutable ? "@" : "$"}${id}'`);
    }

    /**
     * @param {string} id
     * @param {Literal} value
     * @param {boolean} mutable
     * @return {void | Error}
     */
    defineVariable(id, value, mutable) {
        if (mutable && !this.#mutables.has(id)) {
            this.#mutables.set(id, value);
            return;
        }
        if (!mutable && !this.#immutables.has(id)) {
            this.#immutables.set(id, value);
            return;
        }

        return new Error(`Can't redefine variable '${id}' in current scope`);
    }

    /**
     * @param {string} id
     * @param {Literal} value
     * @return {void | Error}
     */
    assignVariable(id, value) {
        if (this.#mutables.has(id)) {
            this.#mutables.set(id, value);
            return;
        } else if (this.parent) {
            const error = this.parent.assignVariable(id, value);
            if (!error) return;
        }

        return new Error(`Variable '${id}' is not defined`);
    }
}

export class InnerScope extends Scope {
    /** @type {GlobalScope} */
    #globalScope;

    /**
     * @param {InnerScope | GlobalScope} parent
     * @param {GlobalScope} globalScope
     */
    constructor(parent, globalScope) {
        super(parent);
        this.#globalScope = globalScope;
    }

    /**
     * @param {string} id
     * @param {boolean} mutable
     * @returns {Literal|Error}
     */
    getValue(id, mutable)  {
        if (!mutable && this.#globalScope.peekZoopContext()?.has(id)) {
            return this.#globalScope.peekZoopContext().get(id);
        }

        return super.getValue(id, mutable);
    }

    /**
     * @param {string} id
     * @param {Literal} value
     * @param {boolean} mutable
     * @returns {void|Error}
     */
    defineVariable(id, value, mutable) {
        if (!mutable && this.#globalScope.peekZoopContext()?.has(id)) {
            return new Error(
                `Can't redefine variable '${id}', already exists in zoop context`,
            );
        }

        return super.defineVariable(id, value, mutable);
    }
}

export class GlobalScope extends Scope {
    /** @type {Map<string, ZoopCall>} */
    #zoopCallbacks;
    /** @type {Stack<ZoopContext>} */
    #zoopContextStack;

    constructor() {
        super(null);
        this.#zoopCallbacks = new Map();
        this.#zoopContextStack = new Stack();

    }

    /**
     * @param {string} id
     * @param {boolean} mutable
     * @returns {Literal|Error}
     */
    getValue(id, mutable) {
        if (!mutable && this.peekZoopContext()?.has(id)) {
            return this.peekZoopContext().get(id);
        }

        return super.getValue(id, mutable);
    }

    /**
     * @param {string} label
     * @param {ZoopCall} callback
     * @returns {Error}
     */
    defineZoopCallback(label, callback) {
        if (this.parent !== null) {
            return new Error("Zoops can be declared only in global scope");
        }

        if (this.#zoopCallbacks.has(label)) {
            return new Error(`zoop '${label}' is already declared`);
        }

        this.#zoopCallbacks.set(label, callback);
    }

    /**
     * @param {string} label
     * @returns {ZoopCall|Error}
     */
    getZoopCallback(label)  {
        if (this.parent !== null) {
            return this.getZoopCallback(label);
        }

        if (!this.#zoopCallbacks.has(label)) {
            return new Error(`zoop '${label}' wasn't declared`);
        }

        return this.#zoopCallbacks.get(label);
    }

    /**
     * @param {ZoopContext} ctx
     * @return {void | Error}
     */
    pushZoopContext(ctx) {
        if(this.#zoopContextStack.size() === MAX_ZOOP_CONTEXTS) {
            throw new Error(`Exceeded maximum number of zoop contexts`);
        }
        this.#zoopContextStack.push(ctx);
    }

    /**
     * @returns {ZoopContext}
     */
    popZoopContext() {
        return this.#zoopContextStack.pop();
    }

    /**
     * @returns {ZoopContext|null}
     */
    peekZoopContext() {
        return this.#zoopContextStack.peek();
    }
}

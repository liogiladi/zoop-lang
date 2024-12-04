"use strict";

import readline from "node:readline";

export const ErrorType = Object.freeze({
    SyntaxError: Symbol("SyntaxError"),
    RuntimeError: Symbol("RuntimeError"),
})

/**
 * Generates an error to the terminal
 * @param {string} src
 * @param {ZoopError} error
 * @param {Position} position
 * @returns {string}
 */
function generateError(src, error, position) {
    const isZoopError = typeof error === "object";

    const errorName = isZoopError ? error[0].description.replace(/([A-Z])/g, ' $1').trim() : "Error";
    const message = isZoopError ? error[1] : error;
    const positionStr = `(${position.toString()})`;

    let output = `\n${wrapANSIColor(`${errorName}:`, "1;31")} ${message} ${wrapANSIColor(positionStr, "38;5;244")}\n`;

    output += src.split("\n")[position[0] - 1] + "\n";
    output += " ".repeat(position[1]) + wrapANSIColor("^", "1;31");

    return output;
}

/**
 * Raising an error to the terminal and exists the program
 * @param {string} code
 * @param {ZoopError} error
 * @param {Position} pos
 * @return {never}
 */
export function raiseError(code, error, pos) {
    console.error(generateError(code, error, pos));
    process.exit(1);
}


/**
 * @param {string} str
 * @param {string} color
 * @returns {string}
 */
export function wrapANSIColor(str, color) {
    return `\x1b[${color}m${str}\x1b[0m`;
}

/**
 * A generic assertion function for different classes to implement
 * @param {unknown} value
 * @param {ZoopError} error
 * @param {string} code
 * @param {Position} pos
 * @constructor
 */
export function ASSERT(value, error, code, pos) {
    if (!value) raiseError(code, error, pos);
}

/**
 * @param {number} min inclusive
 * @param {number} val
 * @param {number} max inclusive
 * @returns {number}
 */
export function clamp(min, val, max) {
    return Math.min(Math.max(min, val), max);
}

/**
 * @param {string} val
 * @returns {boolean}
 */
export function isNum(val) {
    return val !== " " && !isNaN(Number(val));
}

/**
 * @template T
 * @param {T[]} arr
 * @param {T} val
 * @returns {boolean}
 */
export function includes(arr, val) {
    return arr.includes(val);
}

/**
 * @template T
 */
export class Stack {
    /** @type {T[]} **/
    #stack = [];

    /**
     * @param {T} val
     */
    push(val) {
        this.#stack.push(val);
    }

    /**
     * @return {T | null}
     */
    pop() {
        return this.#stack.pop() || null;
    }

    /**
     * @returns {T | null}
     */
    peek() {
        return this.#stack.at(-1) || null;
    }

    /**
     * @return {number}
     */
    size() {
        return this.#stack.length;
    }
}

/**
 * @param {number} value
 * @param {"int" | "uint" | "dec" | "udec"} type
 * @return {boolean}
 */
export function matchNumberValueWithType(value, type) {
    if(!isNum(value+"")) return false;
    const isWhole = Number.isInteger(value);
    const isNegative = value < 0;

    if(!isWhole && type.endsWith("int")) return false;
    if(isNegative && type.startsWith("u")) return false;

    return true;
}
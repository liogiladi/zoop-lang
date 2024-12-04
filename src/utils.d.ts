import { ErrorType } from "./utils.js";

/** ------------------ Errors ------------------ **/

type Error = typeof ErrorType;
declare type ZoopError = string | [type: Error[keyof Error], desc: string];

declare type Assertion = (
    condition: unknown,
    message: string,
    // deno-lint-ignore no-explicit-any
    ...args: any
) => asserts condition;

declare interface Assertable {
    assert: Assertion;
}

/** ------------------ Other ------------------ **/

declare function wrapANSIColor(str: string, color: string): string;

declare class Stack<T> {
    private stack: T[];

    push(val: T): void;
    pop(): void;
    peek(): NonNullable<T> | null;
}

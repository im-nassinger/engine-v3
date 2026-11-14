import type { JsonValue } from './JsonValue.ts';
import type { ParseOutcome } from './ParseOutcome.ts';

export type ValueType<T> = {
    // Untrusted data: a file, the clipboard, a script. Checks the shape; normalize clamps afterwards.
    parse(raw: unknown): ParseOutcome<T>;
    serialize(value: T): JsonValue;
    normalize(value: T): T;
    clone(value: T): T;
    equals(first: T, second: T): boolean;
};

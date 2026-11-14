import type { JointEnds } from '../geometry/index.ts';

import type { ParseOutcome } from './ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, parsePoint, refuse } from './rawChecks.ts';
import type { ValueType } from './ValueType.ts';

// The JointComponent's two ends, saved as { a: { x, y }, b: { x, y } }.
export class JointEndsValue implements ValueType<JointEnds> {
    parse(raw: unknown): ParseOutcome<JointEnds> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
        if (!hasExactlyKeys(raw, ['a', 'b'])) return refuse({ reason: 'wrongType' });

        const parsedA = parsePoint(raw['a']);
        if (!parsedA.ok) return parsedA;

        const parsedB = parsePoint(raw['b']);
        if (!parsedB.ok) return parsedB;

        return accept({ a: parsedA.value, b: parsedB.value });
    }

    serialize(value: JointEnds) {
        return { a: { x: value.a.x, y: value.a.y }, b: { x: value.b.x, y: value.b.y } };
    }

    normalize(value: JointEnds) {
        return value;
    }

    clone(value: JointEnds): JointEnds {
        return { a: { ...value.a }, b: { ...value.b } };
    }

    equals(first: JointEnds, second: JointEnds) {
        const sameA = first.a.x === second.a.x && first.a.y === second.a.y;
        const sameB = first.b.x === second.b.x && first.b.y === second.b.y;

        return sameA && sameB;
    }
}

import { KeyCodes } from '../../keys/index.ts';
import type { KeyCode } from '../../keys/index.ts';

import type { FieldType } from '../FieldType.ts';
import { wordName } from '../names/wordName.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, refuse } from '../rawChecks.ts';

// An input as the World's InputComponent lists it: a name and the keys that press it, such as `jump` on
// Space and W.
export type Input = {
    readonly name: string;
    readonly keys: readonly KeyCode[];
};

// One input, such as `{ "name": "jump", "keys": ["Space", "KeyW"] }`. Its name follows the tag rule
// (wordName), unique in its list (ListFieldType's itemName); each key is a `KeyboardEvent.code` a level
// may use, so Tab, Esc and the browser's keys are refused. An input with no key is kept: it is never held.
export class InputFieldType implements FieldType<Input> {
    readonly kind = 'input';

    parse(raw: unknown): ParseOutcome<Input> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
        if (!hasExactlyKeys(raw, ['name', 'keys'])) return refuse({ reason: 'wrongType' });

        const name = raw['name'];
        if (typeof name !== 'string') return refuse({ reason: 'wrongType' });
        if (wordName(name) === '') return refuse({ reason: 'noName' });

        const keys = raw['keys'];
        if (!Array.isArray(keys)) return refuse({ reason: 'wrongType' });

        const parsedKeys: KeyCode[] = [];
        for (const key of keys) {
            if (typeof key !== 'string') return refuse({ reason: 'wrongType' });
            if (!KeyCodes.isBindable(key)) return refuse({ reason: 'unbindableKey', key });

            parsedKeys.push(key);
        }

        return accept({ name, keys: parsedKeys });
    }

    serialize(value: Input) {
        return { name: value.name, keys: [...value.keys] };
    }

    // The name made a word, and a key listed twice kept once, where it first is.
    normalize(value: Input) {
        return { name: wordName(value.name), keys: [...new Set(value.keys)] };
    }

    clone(value: Input) {
        return { name: value.name, keys: [...value.keys] };
    }

    equals(first: Input, second: Input) {
        if (first.name !== second.name) return false;
        if (first.keys.length !== second.keys.length) return false;

        return first.keys.every((key, index) => key === second.keys[index]);
    }
}

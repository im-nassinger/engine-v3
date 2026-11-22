import type { Input } from '../../../core/fields/index.ts';
import type { KeyCode } from '../../../core/triggers/index.ts';

// The name Add input gives, numbered from 1 past the ones taken: `input_1`, then `input_2`.
const NEW_NAME = 'input';

// What the Inputs card commits: the World's inputs with one added, renamed, given new keys or removed.
// Each gives a fresh list; the write makes the names words and refuses a name already taken or with
// nothing left, with its reason.
export class InputEdits {
    // A new input has no key until one is pressed on its row.
    static withNewInput(inputs: readonly Input[]) {
        const taken = new Set(inputs.map((input) => input.name));
        let number = 1;
        while (taken.has(`${NEW_NAME}_${number}`)) {
            number += 1;
        }

        return [...InputEdits.copied(inputs), { name: `${NEW_NAME}_${number}`, keys: [] }];
    }

    static renamed(inputs: readonly Input[], index: number, typedName: string) {
        return inputs.map((input, inputIndex) => {
            if (inputIndex !== index) return InputEdits.copy(input);

            return { name: typedName, keys: [...input.keys] };
        });
    }

    static withKeys(inputs: readonly Input[], index: number, keys: readonly KeyCode[]) {
        return inputs.map((input, inputIndex) => {
            if (inputIndex !== index) return InputEdits.copy(input);

            return { name: input.name, keys: [...keys] };
        });
    }

    static without(inputs: readonly Input[], index: number) {
        const kept = inputs.filter((_input, inputIndex) => inputIndex !== index);

        return InputEdits.copied(kept);
    }

    private static copied(inputs: readonly Input[]) {
        return inputs.map((input) => InputEdits.copy(input));
    }

    private static copy(input: Input) {
        return { name: input.name, keys: [...input.keys] };
    }
}

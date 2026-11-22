import type { Variable } from '../../../core/fields/index.ts';

// The name Add variable gives, numbered from 1 past the ones taken: `variable_1`, then `variable_2`.
const NEW_NAME = 'variable';

// What the Variables card commits: the World's variables with one added, renamed, given a new starting
// number or removed. Each gives a fresh list; the write makes the names words and refuses a name already
// taken or with nothing left, with its reason.
export class VariableEdits {
    static withNewVariable(variables: readonly Variable[]) {
        const taken = new Set(variables.map((variable) => variable.name));
        let number = 1;
        while (taken.has(`${NEW_NAME}_${number}`)) {
            number += 1;
        }

        return [...VariableEdits.copied(variables), { name: `${NEW_NAME}_${number}`, value: 0 }];
    }

    static renamed(variables: readonly Variable[], index: number, typedName: string) {
        return variables.map((variable, variableIndex) => {
            if (variableIndex !== index) return { ...variable };

            return { name: typedName, value: variable.value };
        });
    }

    static withValue(variables: readonly Variable[], index: number, value: number) {
        return variables.map((variable, variableIndex) => {
            if (variableIndex !== index) return { ...variable };

            return { name: variable.name, value };
        });
    }

    static without(variables: readonly Variable[], index: number) {
        const kept = variables.filter((_variable, variableIndex) => variableIndex !== index);

        return VariableEdits.copied(kept);
    }

    private static copied(variables: readonly Variable[]) {
        return variables.map((variable) => ({ ...variable }));
    }
}

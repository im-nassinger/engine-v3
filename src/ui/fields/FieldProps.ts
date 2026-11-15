import type { FieldModel } from '../../editor/inspector/index.ts';

// What every field component takes: the field with its value (or MIXED), and where a new value goes.
// onCommit makes the undo step on every shown entity; a refusal comes back as status text.
export type FieldProps = {
    field: FieldModel;
    onCommit: (value: unknown) => void;
};

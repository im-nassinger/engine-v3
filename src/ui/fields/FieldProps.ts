import type { Axis } from '../../editor/commands/index.ts';
import type { FieldModel } from '../../editor/inspector/index.ts';

// What every field component takes: the field with its value (or MIXED), and where a new value goes.
// onCommit makes the undo step on every shown entity; a refusal comes back as status text. A vector's
// box commits only its own axis, so each entity keeps its other one.
export type FieldProps = {
    field: FieldModel;
    onCommit: (value: unknown) => void;
    onCommitAxis: (axis: Axis, value: number) => void;
};

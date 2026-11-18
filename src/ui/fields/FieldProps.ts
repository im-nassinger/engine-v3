import type { ComponentTypeName } from '../../core/components/index.ts';
import type { EntityId } from '../../core/level/index.ts';
import type { Axis } from '../../editor/commands/index.ts';
import type { FieldModel } from '../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../editor/session/index.ts';

// Whose field it is: an entity field lists the level's entities but its own, and a list keeps its fold
// per component type and key.
export type FieldSubject = {
    readonly openLevel: OpenLevel;
    readonly typeName: ComponentTypeName;
    readonly entityIds: readonly EntityId[];
};

// A slider dragged changes the level as it moves and makes its one step on release. Without it, a
// slider commits through onCommit when let go, as a list's item does.
export type FieldSlideHandlers = {
    readonly slideTo: (value: number) => void;
    readonly release: (value: number) => void;
};

// What every field component takes: the field with its value (or MIXED), and where a new value goes.
// onCommit makes the undo step on every shown entity; a refusal comes back as status text. A vector's
// box commits only its own axis, so each entity keeps its other one.
export type FieldProps = {
    field: FieldModel;
    subject: FieldSubject;
    onCommit: (value: unknown) => void;
    onCommitAxis: (axis: Axis, value: number) => void;
    slide?: FieldSlideHandlers;
};

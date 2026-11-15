import type { ComponentTypeName } from '../../../core/components/index.ts';
import type { EntityId } from '../../../core/level/index.ts';

// What a message's fix button does, as plain data, so the messages never import the edits. v1's only fix
// adds the missing partner.
export type MessageFix = {
    readonly kind: 'addComponent';
    // "Add ShapeComponent"
    readonly label: string;
    readonly componentType: ComponentTypeName;
};

// A short sentence about a setup, shown on the card it is about. Never blocks anything.
export type EditorMessage = {
    readonly kind: 'warning' | 'tip';
    // Undefined for a level-wide message, such as a failed save.
    readonly entityId: EntityId | undefined;
    readonly componentType: ComponentTypeName | undefined;
    // The field it is about, for `missing entity`; undefined when it is about the whole card.
    readonly fieldKey: string | undefined;
    readonly text: string;
    readonly fix: MessageFix | undefined;
};

export function sameMessages(first: readonly EditorMessage[], second: readonly EditorMessage[]) {
    if (first.length !== second.length) return false;

    return first.every((message, index) => sameMessage(message, second[index] as EditorMessage));
}

function sameMessage(first: EditorMessage, second: EditorMessage) {
    const sameFix =
        first.fix === second.fix ||
        (first.fix !== undefined &&
            second.fix !== undefined &&
            first.fix.label === second.fix.label &&
            first.fix.componentType === second.fix.componentType);

    return (
        first.kind === second.kind &&
        first.entityId === second.entityId &&
        first.componentType === second.componentType &&
        first.fieldKey === second.fieldKey &&
        first.text === second.text &&
        sameFix
    );
}

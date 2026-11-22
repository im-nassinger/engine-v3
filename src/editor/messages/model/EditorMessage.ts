import type { ComponentTypeName } from '../../../core/components/index.ts';
import type { JsonValue } from '../../../core/fields/index.ts';
import type { EntityId } from '../../../core/level/index.ts';

// What a message's fix button does, as plain data, so the messages never import the edits. The only fix
// adds a component: the missing partner, the five inputs, a Surface as sensor.
export type MessageFix = {
    readonly kind: 'addComponent';
    // "Add Shape"
    readonly label: string;
    readonly componentType: ComponentTypeName;
    // Values written over the component's defaults, in the file form, such as `{ sensor: true }`.
    readonly savedValues: Readonly<Record<string, JsonValue>> | undefined;
};

// A short sentence about a setup, shown on the card it is about. Never blocks anything.
export type EditorMessage = {
    readonly kind: 'warning' | 'tip';
    // Undefined for a level-wide message, such as a failed save.
    readonly entityId: EntityId | undefined;
    readonly componentType: ComponentTypeName | undefined;
    // The field it is about, for `missing entity`; undefined when it is about the whole card.
    readonly fieldKey: string | undefined;
    // The list item it is about, by its id, such as one trigger of a TriggerComponent; undefined otherwise.
    readonly itemId: number | undefined;
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
            first.fix.componentType === second.fix.componentType &&
            JSON.stringify(first.fix.savedValues) === JSON.stringify(second.fix.savedValues));

    return (
        first.kind === second.kind &&
        first.entityId === second.entityId &&
        first.componentType === second.componentType &&
        first.fieldKey === second.fieldKey &&
        first.itemId === second.itemId &&
        first.text === second.text &&
        sameFix
    );
}

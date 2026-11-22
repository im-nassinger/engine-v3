import type { EntityId } from '../../../core/level/index.ts';
import type { EditorMessage, MessageFix } from '../../messages/index.ts';

// One editor message on a card. With several entities selected, the same message on several of them is
// one note, and its fix runs on all of them in one step.
export type CardNote = {
    readonly kind: EditorMessage['kind'];
    readonly text: string;
    // The field it sits under; undefined when it is about the whole card.
    readonly fieldKey: string | undefined;
    // The list item it sits under, such as one trigger, by its id; undefined for the field or card.
    readonly itemId: number | undefined;
    readonly fix: MessageFix | undefined;
    readonly entityIds: readonly EntityId[];
};

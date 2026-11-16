import type { ClipboardCodec } from '../../clipboard/index.ts';
import type { SkippedEntity } from '../../history/index.ts';
import type { EditorSession } from '../../session/index.ts';
import { skipEntities } from '../shared/skipEntities.ts';
import type { SkipResult } from '../shared/skipEntities.ts';
import { skippedRefusal } from '../shared/skippedRefusal.ts';

export type SelectionCopy =
    | {
          readonly kind: 'copied';
          readonly text: string;
          readonly split: SkipResult;
          readonly skipped: readonly SkippedEntity[];
      }
    | { readonly kind: 'refused'; readonly reason: string };

// The selection split by the skip rule: the World and the camera are never copied.
export function selectionSplit(session: EditorSession) {
    const { level, selection } = session.openLevel;

    return skipEntities(level, selection.entities, ['world', 'camera']);
}

// The selection without the World and the camera, as the clipboard's text. Refused, naming what was
// skipped, when nothing else is selected. pastParticiple words the refusal: "The World can't be cut".
export function copySelection(session: EditorSession, codec: ClipboardCodec, pastParticiple: string): SelectionCopy {
    const split = selectionSplit(session);
    const refusal = skippedRefusal(split, pastParticiple);
    if (refusal !== undefined) return { kind: 'refused', reason: refusal };

    const text = codec.encode(split.allowed, session.openLevel);

    return { kind: 'copied', text, split, skipped: split.skipped };
}

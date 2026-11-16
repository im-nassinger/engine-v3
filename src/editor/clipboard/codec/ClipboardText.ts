import type { Point } from '../../../core/geometry/index.ts';
import type { ReadRefusal } from '../../../core/level-data/index.ts';

// The key whose value marks a clipboard text as this game's entities.
export const CLIPBOARD_TAG_KEY = 'engine-v3';
export const CLIPBOARD_TAG = 'entities';

// Every key a clipboard text holds, no more and no fewer.
export const CLIPBOARD_KEYS = [
    CLIPBOARD_TAG_KEY,
    'formatVersion',
    'physicsVersion',
    'sourceToken',
    'centre',
    'entities',
];

// What was copied, once the text's tag, keys and versions are checked. The entities are still untrusted:
// LevelReader checks them against the level they are pasted into.
export type EntityFragment = {
    // The opening of the level they were copied from.
    readonly sourceToken: string;
    // The middle of the copied set's box, in level positions.
    readonly centre: Point;
    // One nested entity per copied root, as LevelWriter.writeSubtree writes them, each root's
    // TransformComponent written as if its parent were the World.
    readonly entities: readonly unknown[];
};

export type ClipboardDecodeResult =
    | { readonly kind: 'entities'; readonly fragment: EntityFragment }
    // Not this game's: plain text, or other JSON.
    | { readonly kind: 'notOurs' }
    // Ours, but damaged or from a newer game. A reason, never a sentence: the paste writes the sentence.
    | { readonly kind: 'refused'; readonly refusal: ReadRefusal };

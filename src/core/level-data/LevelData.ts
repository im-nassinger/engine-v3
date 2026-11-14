import type { EntityId, JsonValue } from '../fields/index.ts';

// One component's values, keyed by file key: a field's attribute name, a stored value's key in snake_case.
export type ComponentData = { readonly [fileKey: string]: JsonValue };

// One entity as plain data, the same shape as one entity in level.json. Copies, undo of a delete, the
// clipboard and the play copy all use it.
export type EntityData = {
    readonly id: EntityId;
    readonly parent: EntityId | null;
    readonly hidden: boolean;
    readonly locked: boolean;
    // Keyed by component type name, in card order.
    readonly components: { readonly [typeName: string]: ComponentData };
};

// What only the editor reads. The v3 play file drops it.
export type EditorData = {
    readonly gridSize: number;
    readonly foldedRows: readonly EntityId[];
};

// The whole level as plain data: level.json once turned into JSON text.
export type LevelData = {
    readonly format: typeof LEVEL_FORMAT;
    readonly formatVersion: number;
    readonly physicsVersion: number;
    readonly name: string;
    readonly editor: EditorData;
    // Entities panel order: each parent before its children, children in their order.
    readonly entities: readonly EntityData[];
};

// The first thing the reader checks: without it, a file is not a level at all.
export const LEVEL_FORMAT = 'engine-v3-level';

// Goes up with every change to the shape of level.json, with an upgrade step for each.
export const CURRENT_FORMAT_VERSION = 1;

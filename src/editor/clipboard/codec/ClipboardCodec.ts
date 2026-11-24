import type { DerivedCaches } from '../../../core/derived/index.ts';
import { Bounds } from '../../../core/geometry/index.ts';
import type { Entity, Level } from '../../../core/level/index.ts';
import { CURRENT_FORMAT_VERSION, entityWithoutSensor, PhysicsVersions } from '../../../core/level-data/index.ts';
import type { EntityData, LevelWriter, ReadRefusal } from '../../../core/level-data/index.ts';
import { isPlainObject } from '../../../core/fields/index.ts';

import { CLIPBOARD_KEYS, CLIPBOARD_TAG, CLIPBOARD_TAG_KEY } from './ClipboardText.ts';
import type { ClipboardDecodeResult } from './ClipboardText.ts';
import { copiedRoots } from './copiedRoots.ts';
import { withRootTransform } from '../placement/rootTransform.ts';

// The open level a copy is made from: an OpenLevel is one.
export type CopySource = {
    readonly level: Level;
    readonly caches: DerivedCaches;
    readonly sourceToken: string;
};

type RawRecord = Readonly<Record<string, unknown>>;

function isWholeNumber(raw: unknown): raw is number {
    return typeof raw === 'number' && Number.isSafeInteger(raw);
}

function isFiniteNumber(raw: unknown): raw is number {
    return typeof raw === 'number' && Number.isFinite(raw);
}

function damaged(detail: string): ClipboardDecodeResult {
    return { kind: 'refused', refusal: { reason: 'damaged', detail } };
}

// Turns copied entities into the clipboard's tagged JSON text and back. Decoding checks only the text's
// own shape: the entities inside are checked by LevelReader against the level they are pasted into.
export class ClipboardCodec {
    private readonly writer: LevelWriter;

    constructor(writer: LevelWriter) {
        this.writer = writer;
    }

    // The copied roots of the entities (copiedRoots) with everything inside them. Throws when nothing
    // is left to copy: the command says so before it gets here.
    encode(entities: readonly Entity[], source: CopySource): string {
        const roots = copiedRoots(source.level, entities);
        if (roots.length === 0) {
            throw new Error('Nothing is left to copy once the World, the camera and nested entities are left out.');
        }

        const written = this.writer.writeSubtree(roots);
        const entitiesData = written.map((data, index) => {
            const root = roots[index];
            if (root === undefined) throw new Error('writeSubtree gives one entity per root.');

            return this.withLevelTransform(data, root, source);
        });

        const text = {
            [CLIPBOARD_TAG_KEY]: CLIPBOARD_TAG,
            formatVersion: CURRENT_FORMAT_VERSION,
            physicsVersion: PhysicsVersions.current,
            sourceToken: source.sourceToken,
            box: boxText(roots, source),
            entities: entitiesData,
        };

        return JSON.stringify(text);
    }

    decode(text: string): ClipboardDecodeResult {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            return { kind: 'notOurs' };
        }

        if (!isPlainObject(parsed)) return { kind: 'notOurs' };
        if (parsed[CLIPBOARD_TAG_KEY] !== CLIPBOARD_TAG) return { kind: 'notOurs' };

        return decodeTagged(parsed);
    }

    // The root's TransformComponent as if its parent were the World: what it looks like on screen.
    private withLevelTransform(data: EntityData, root: Entity, source: CopySource): EntityData {
        const { worldMatrices } = source.caches;
        const worldInverse = worldMatrices.matrixOf(source.level.world).invert();
        if (worldInverse === undefined) throw new Error("The World's TransformComponent is never changed.");

        const levelTransform = worldInverse.multiply(worldMatrices.matrixOf(root)).decompose();

        return withRootTransform(data, levelTransform, this.writer);
    }
}

// The roots' box in level positions. A root that draws nothing counts as its origin.
function boxText(roots: readonly Entity[], source: CopySource) {
    const { bounds, worldMatrices } = source.caches;
    let box: Bounds | undefined;

    for (const root of roots) {
        const origin = worldMatrices.matrixOf(root).apply({ x: 0, y: 0 });
        const rootBox = bounds.subtreeBoundsOf(root) ?? new Bounds(origin.x, origin.y, origin.x, origin.y);
        box = box === undefined ? rootBox : box.union(rootBox);
    }

    if (box === undefined) throw new Error('A copy has at least one root.');

    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
}

function decodeTagged(raw: RawRecord): ClipboardDecodeResult {
    const keys = Object.keys(raw);
    const unknownKey = keys.find((key) => !CLIPBOARD_KEYS.includes(key));
    if (unknownKey !== undefined) return damaged(`the clipboard text has an unknown value ${unknownKey}`);

    const missingKey = CLIPBOARD_KEYS.find((key) => !Object.hasOwn(raw, key));
    if (missingKey !== undefined) return damaged(`the clipboard text has no ${missingKey}`);

    const versionRefusal = checkVersions(raw['formatVersion'], raw['physicsVersion']);
    if (versionRefusal !== undefined) return { kind: 'refused', refusal: versionRefusal };

    const sourceToken = raw['sourceToken'];
    if (typeof sourceToken !== 'string') return damaged('the source token is not text');

    const box = readBox(raw['box']);
    if (box === undefined) return damaged('the box is not a box');

    const entities = raw['entities'];
    if (!Array.isArray(entities)) return damaged('the entities are not a list');
    if (entities.length === 0) return damaged('the entities are an empty list');

    // Copied by a game of format version 1, before the SurfaceComponent lost its Sensor setting.
    let upgraded: unknown[] = entities;
    if (raw['formatVersion'] === 1) {
        upgraded = entities.map((entity: unknown) => entityWithoutSensor(entity));
    }

    return { kind: 'entities', fragment: { sourceToken, box, entities: upgraded } };
}

const BOX_KEYS = ['left', 'top', 'right', 'bottom'];

// Four finite numbers, no more, the right not left of the left and the bottom not above the top.
function readBox(raw: unknown) {
    if (!isPlainObject(raw)) return undefined;

    const keys = Object.keys(raw);
    const hasBoxKeys = keys.length === BOX_KEYS.length && BOX_KEYS.every((key) => keys.includes(key));
    if (!hasBoxKeys) return undefined;

    const { left, top, right, bottom } = raw;
    if (!isFiniteNumber(left) || !isFiniteNumber(top) || !isFiniteNumber(right) || !isFiniteNumber(bottom)) {
        return undefined;
    }

    if (right < left || bottom < top) return undefined;

    return new Bounds(left, top, right, bottom);
}

// The same rules as a level file's: only a newer game writes a version above this one's.
function checkVersions(formatVersion: unknown, physicsVersion: unknown): ReadRefusal | undefined {
    if (!isWholeNumber(formatVersion) || formatVersion < 1) {
        return { reason: 'damaged', detail: 'the format version is not a whole number from 1' };
    }

    if (formatVersion > CURRENT_FORMAT_VERSION) return { reason: 'newerVersion', fileVersion: formatVersion };

    if (!isWholeNumber(physicsVersion) || physicsVersion < 1) {
        return { reason: 'damaged', detail: 'the physics version is not a whole number from 1' };
    }

    if (physicsVersion > PhysicsVersions.current) return { reason: 'newerVersion', fileVersion: formatVersion };

    return undefined;
}

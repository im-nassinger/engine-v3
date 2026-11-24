import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    JointComponent,
    NameComponent,
    PathComponent,
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
    createV1Registry,
} from '../../../core/components/index.ts';
import { DerivedCaches } from '../../../core/derived/index.ts';
import { Bounds } from '../../../core/geometry/index.ts';
import type { Matrix2D } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import {
    CURRENT_FORMAT_VERSION,
    FormatUpgrader,
    LevelReader,
    LevelWriter,
    PhysicsVersions,
    V1_LEVEL_LIMITS,
} from '../../../core/level-data/index.ts';
import type { EntityData } from '../../../core/level-data/index.ts';

import { ClipboardCodec } from './ClipboardCodec.ts';
import type { CopySource } from './ClipboardCodec.ts';
import type { ClipboardDecodeResult, EntityFragment } from './ClipboardText.ts';

// Top row first: rope, crate, group. The group is rotated and skewed and holds a ball.
function buildLevel() {
    const level = Level.createNew();

    const group = level.createEntity(level.world, 0);
    group.addComponent(
        new TransformComponent({ position: { x: 100, y: 50 }, rotation: 30, scale: { x: 2, y: 1 }, skew: 10 }),
    );
    group.addComponent(new NameComponent({ name: 'Group 1' }));

    const ball = level.createEntity(group, 0);
    ball.addComponent(
        new TransformComponent({ position: { x: 5, y: 6 }, rotation: 15, scale: { x: 1, y: 1 }, skew: -20 }),
    );
    ball.addComponent(new NameComponent({ name: 'Ball' }));
    ball.addComponent(new ShapeComponent({ geometry: { kind: 'circle', radius: 20 } }));

    const crate = level.createEntity(level.world, 0);
    crate.addComponent(new TransformComponent({ ...TransformComponent.schema.defaults(), position: { x: 300, y: 0 } }));
    crate.addComponent(new NameComponent({ name: 'Crate' }));
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 20 } }));
    crate.addComponent(new StyleComponent());
    crate.addComponent(new BodyComponent());
    crate.addComponent(new SurfaceComponent());
    crate.setLocked(true);

    const rope = level.createEntity(level.world, 0);
    rope.addComponent(new TransformComponent());
    rope.addComponent(new NameComponent({ name: 'Rope' }));
    rope.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: ball.id, b: crate.id }));
    rope.addComponent(new PathComponent());
    rope.setHidden(true);

    const caches = new DerivedCaches(level);
    const source: CopySource = { level, caches, sourceToken: 'opening-1' };

    return { level, source, group, ball, crate, rope };
}

const codec = new ClipboardCodec(new LevelWriter());

function requireFragment(result: ClipboardDecodeResult): EntityFragment {
    if (result.kind !== 'entities') throw new Error(`Expected entities, got ${result.kind}.`);

    return result.fragment;
}

function parsedText(text: string): Record<string, unknown> {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('The text is not an object.');

    return { ...parsed };
}

function withoutTransforms(data: EntityData): EntityData {
    const components = Object.fromEntries(
        Object.entries(data.components).filter(([typeName]) => typeName !== 'TransformComponent'),
    );
    return { ...data, components, children: data.children.map(withoutTransforms) };
}

function levelMatrixOfRoot(fragment: EntityFragment, index: number) {
    const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
    const target = Level.createNew();
    const read = reader.readSubtree(target, fragment.entities, target.world, 0);
    if (!read.ok) throw new Error(`The copy was refused: ${read.refusal.reason}.`);

    const root = read.value[index];
    if (root === undefined) throw new Error(`No root ${index}.`);

    return new DerivedCaches(target).worldMatrices.matrixOf(root);
}

function largestDifference(first: Matrix2D, second: Matrix2D) {
    const pairs = [
        [first.a, second.a],
        [first.b, second.b],
        [first.c, second.c],
        [first.d, second.d],
        [first.tx, second.tx],
        [first.ty, second.ty],
    ] as const;

    return Math.max(...pairs.map(([one, other]) => Math.abs(one - other)));
}

describe('ClipboardCodec.encode', () => {
    test('writes the tag, the two versions, the source token, the box and the entities', () => {
        const { source, crate } = buildLevel();
        const record = parsedText(codec.encode([crate], source));

        expect(Object.keys(record)).toEqual([
            'engine-v3',
            'formatVersion',
            'physicsVersion',
            'sourceToken',
            'box',
            'entities',
        ]);
        expect(record['engine-v3']).toBe('entities');
        expect(record['formatVersion']).toBe(CURRENT_FORMAT_VERSION);
        expect(record['physicsVersion']).toBe(PhysicsVersions.current);
        expect(record['sourceToken']).toBe('opening-1');
        expect(record['box']).toEqual({ left: 279, top: -11, right: 321, bottom: 11 });
    });

    test('leaves out the World, the camera and anything inside another copied entity, in panel order', () => {
        const { level, source, group, ball, crate } = buildLevel();
        const decoded = requireFragment(
            codec.decode(codec.encode([ball, level.world, group, level.camera, crate], source)),
        );
        const ids = decoded.entities.map((entity) => (entity as EntityData).id);

        expect(ids).toEqual([crate.id, group.id]);
        expect((decoded.entities[1] as EntityData).children.map((child) => child.id)).toEqual([ball.id]);
    });

    test('copies a joint only when it is given', () => {
        const { source, ball, crate } = buildLevel();
        const record = parsedText(codec.encode([ball, crate], source));
        const names = (record['entities'] as EntityData[]).map(
            (entity) => (entity.components['NameComponent'] as { name: string }).name,
        );

        expect(names).toEqual(['Crate', 'Ball']);
    });

    test('refuses to encode when only the World and the camera are given', () => {
        const { level, source } = buildLevel();

        expect(() => codec.encode([level.world, level.camera], source)).toThrow();
    });

    test('a round trip keeps every component, switch and child', () => {
        const { source, group, crate, rope } = buildLevel();
        const originals = new LevelWriter().writeSubtree([rope, crate, group]);

        const fragment = requireFragment(codec.decode(codec.encode([group, crate, rope], source)));
        const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
        const target = Level.createNew();
        const read = reader.readSubtree(target, fragment.entities, target.world, 0);
        if (!read.ok) throw new Error('The copy was refused.');
        const pasted = new LevelWriter().writeSubtree(read.value);

        expect(pasted).toEqual(fragment.entities);
        expect(pasted.map(withoutTransforms)).toEqual(originals.map(withoutTransforms));
        expect(pasted[0]?.hidden).toBe(true);
        expect(pasted[1]?.locked).toBe(true);
        expect(pasted[2]?.children[0]?.components['TransformComponent']).toEqual(
            originals[2]?.children[0]?.components['TransformComponent'],
        );
    });

    test('a child of a rotated, skewed group encodes as it looks on screen', () => {
        const { source, ball } = buildLevel();
        const fragment = requireFragment(codec.decode(codec.encode([ball], source)));

        const onScreen = source.caches.worldMatrices.matrixOf(ball);

        expect(largestDifference(levelMatrixOfRoot(fragment, 0), onScreen)).toBeLessThan(1e-9);
    });

    test("the box is the copied set's box, a root that draws nothing counting as its origin", () => {
        const { source, crate, rope } = buildLevel();
        const record = parsedText(codec.encode([crate, rope], source));

        // The rope draws nothing, so its origin at 0, 0 counts, and the crate's box is the right end.
        const crateBox = source.caches.bounds.subtreeBoundsOf(crate);

        expect(record['box']).toEqual({
            left: 0,
            top: crateBox?.top,
            right: crateBox?.right,
            bottom: crateBox?.bottom,
        });
    });
});

describe('ClipboardCodec.decode', () => {
    function tagged(changes: Record<string, unknown>, removed: readonly string[] = []) {
        const { source, crate } = buildLevel();
        const record: Record<string, unknown> = { ...parsedText(codec.encode([crate], source)), ...changes };
        for (const key of removed) {
            delete record[key];
        }

        return JSON.stringify(record);
    }

    test('gives the source token, the box and the entities', () => {
        const { source, crate } = buildLevel();
        const fragment = requireFragment(codec.decode(codec.encode([crate], source)));

        expect(fragment.sourceToken).toBe('opening-1');
        expect(fragment.box).toEqual(new Bounds(279, -11, 321, 11));
        expect(fragment.entities).toHaveLength(1);
    });

    test.each([
        ['plain text', 'Crate'],
        ['an empty text', ''],
        ['a number', '12'],
        ['a list', '[1, 2]'],
        ['other JSON', '{"name": "Crate"}'],
        ['a level file', '{"format": "engine-v3-level", "formatVersion": 1}'],
        ['another tag value', '{"engine-v3": "level"}'],
    ])('%s is not ours', (_what, text) => {
        expect(codec.decode(text)).toEqual({ kind: 'notOurs' });
    });

    test.each([
        ['an unknown key', tagged({ extra: 1 })],
        ['a missing key', tagged({}, ['box'])],
        ['a format version that is not a whole number', tagged({ formatVersion: 1.5 })],
        ['a physics version of 0', tagged({ physicsVersion: 0 })],
        ['a source token that is not text', tagged({ sourceToken: 7 })],
        ['a box with a missing side', tagged({ box: { left: 1, top: 2, right: 3 } })],
        ['a box with an extra value', tagged({ box: { left: 1, top: 2, right: 3, bottom: 4, z: 5 } })],
        ['a box side that is not a number', tagged({ box: { left: 'a', top: 2, right: 3, bottom: 4 } })],
        ['a box whose right is left of its left', tagged({ box: { left: 3, top: 2, right: 1, bottom: 4 } })],
        ['entities that are not a list', tagged({ entities: {} })],
        ['an empty list of entities', tagged({ entities: [] })],
    ])('a damaged text, %s, is refused', (_what, text) => {
        const result = codec.decode(text);

        expect(result.kind === 'refused' && result.refusal.reason).toBe('damaged');
    });

    test('a newer format version is refused', () => {
        const result = codec.decode(tagged({ formatVersion: CURRENT_FORMAT_VERSION + 1 }));

        expect(result).toEqual({
            kind: 'refused',
            refusal: { reason: 'newerVersion', fileVersion: CURRENT_FORMAT_VERSION + 1 },
        });
    });

    test('a newer physics version is refused', () => {
        const result = codec.decode(tagged({ physicsVersion: PhysicsVersions.current + 1 }));

        expect(result).toEqual({
            kind: 'refused',
            refusal: { reason: 'newerVersion', fileVersion: CURRENT_FORMAT_VERSION },
        });
    });
});

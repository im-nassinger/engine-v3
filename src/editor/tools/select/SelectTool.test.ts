import { describe, expect, test } from 'vitest';

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import { EditorSession } from '../../session/index.ts';
import type { SnapResult, Snapper } from '../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../../commands/index.ts';
import type { LevelPointerInput, Modifiers, Tool } from '../Tool.ts';

import { SelectTool } from './SelectTool.ts';

const NO_SNAPPING: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point): SnapResult => ({ point, snappedX: false, snappedY: false }),
};

function place(level: Level, parent: Entity, position: Point) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', position);
    entity.addComponent(transform);

    return entity;
}

// A filled 100 px square, its centre at the position.
function addSquare(level: Level, parent: Entity, position: Point) {
    const square = place(level, parent, position);
    square.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 100, height: 100 } }));
    square.addComponent(new StyleComponent());

    return square;
}

// The World holds a lone square at 100, 100 and a group at 400, 100 holding two squares side by side
// (at 350, 100 and 450, 100 in the level), one of them a group itself holding a square. The camera holds
// a square at -300, -200. Screen and level positions are the same at zoom 1.
function buildSelectTest() {
    const level = Level.createNew();
    const lone = addSquare(level, level.world, { x: 100, y: 100 });
    const group = place(level, level.world, { x: 400, y: 100 });
    const left = addSquare(level, group, { x: -50, y: 0 });
    const innerGroup = place(level, group, { x: 50, y: 0 });
    const deep = addSquare(level, innerGroup, { x: 0, y: 0 });
    const score = addSquare(level, level.camera, { x: -300, y: -200 });

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.view.setSize(800, 600);
    const tool = new SelectTool();
    tool.activate({
        get openLevel() {
            return session.openLevel;
        },
        view: session.view,
        snapper: NO_SNAPPING,
        commands: createCommandRegistry(session),
        status: session.status,
        reader: session.reader,
        finished: () => {},
    });
    const { selection, currentGroup } = session.openLevel;

    return { level, lone, group, left, innerGroup, deep, score, session, tool, selection, currentGroup };
}

type PointerOptions = Partial<Modifiers> & { readonly clickCount?: number };

function pointer(position: Point, options: PointerOptions = {}): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: 'left',
        modifiers: { shift: options.shift ?? false, alt: options.alt ?? false, ctrl: options.ctrl ?? false },
        clickCount: options.clickCount ?? 1,
    };
}

function click(tool: SelectTool, position: Point, options: PointerOptions = {}) {
    tool.pointerDown(pointer(position, options));
    tool.pointerUp(pointer(position, options));
}

function doubleClick(tool: SelectTool, position: Point) {
    click(tool, position);
    click(tool, position, { clickCount: 2 });
}

function drag(tool: SelectTool, from: Point, to: Point, options: PointerOptions = {}) {
    tool.pointerDown(pointer(from, options));
    tool.pointerMove(pointer(to, options));
    tool.pointerUp(pointer(to, options));
}

describe('SelectTool clicks: the press table', () => {
    test('a click on empty space clears the selection', () => {
        const { tool, selection, lone } = buildSelectTest();
        selection.replace([lone.id]);

        click(tool, { x: -200, y: 300 });

        expect(selection.isEmpty).toBe(true);
    });

    test('a press on an unselected entity selects it at once, before the release', () => {
        const { tool, selection, lone, left } = buildSelectTest();
        selection.replace([left.id]);

        tool.pointerDown(pointer({ x: 100, y: 100 }));

        expect(selection.ids).toEqual([lone.id]);
    });

    test('a click inside a group selects the group, as seen from the World', () => {
        const { tool, selection, group } = buildSelectTest();

        click(tool, { x: 450, y: 100 });

        expect(selection.ids).toEqual([group.id]);
    });

    test('a press on a selected entity keeps the selection until the release narrows it', () => {
        const { tool, selection, lone, group } = buildSelectTest();
        selection.replace([lone.id, group.id]);

        tool.pointerDown(pointer({ x: 100, y: 100 }));
        expect(selection.ids).toEqual([lone.id, group.id]);

        tool.pointerUp(pointer({ x: 100, y: 100 }));
        expect(selection.ids).toEqual([lone.id]);
    });

    test('Shift+click adds an entity, and removes it when selected', () => {
        const { tool, selection, lone, group } = buildSelectTest();
        selection.replace([lone.id]);

        click(tool, { x: 350, y: 100 }, { shift: true });
        expect(selection.ids).toEqual([lone.id, group.id]);

        click(tool, { x: 100, y: 100 }, { shift: true });
        expect(selection.ids).toEqual([group.id]);
    });

    test('Shift+click on empty space changes nothing', () => {
        const { tool, selection, lone } = buildSelectTest();
        selection.replace([lone.id]);

        click(tool, { x: -200, y: 300 }, { shift: true });

        expect(selection.ids).toEqual([lone.id]);
    });

    test('a 2 px drag is a click, and 3 px is a drag', () => {
        const { tool, selection, lone } = buildSelectTest();
        selection.replace([lone.id]);

        drag(tool, { x: -200, y: 300 }, { x: -198, y: 300 });
        expect(selection.isEmpty).toBe(true);
        expect(tool.selectionBox).toBeUndefined();

        selection.replace([lone.id]);
        tool.pointerDown(pointer({ x: -200, y: 300 }));
        tool.pointerMove(pointer({ x: -197, y: 300 }));
        expect(tool.selectionBox).toBeDefined();
    });

    test('dragging an unselected entity selects it; the release is not a click', () => {
        const { tool, selection, lone, group } = buildSelectTest();
        selection.replace([group.id]);

        drag(tool, { x: 100, y: 100 }, { x: 140, y: 100 });

        expect(selection.ids).toEqual([lone.id]);
        expect(tool.selectionBox).toBeUndefined();
    });

    test('dragging a selected entity keeps the whole selection', () => {
        const { tool, selection, lone, group } = buildSelectTest();
        selection.replace([lone.id, group.id]);

        drag(tool, { x: 100, y: 100 }, { x: 140, y: 100 });

        expect(selection.ids).toEqual([lone.id, group.id]);
    });

    test('only the left button selects', () => {
        const { tool, selection, lone } = buildSelectTest();

        tool.pointerDown({ ...pointer({ x: 100, y: 100 }), button: 'right' });
        tool.pointerUp({ ...pointer({ x: 100, y: 100 }), button: 'right' });

        expect(selection.isEmpty).toBe(true);
        expect(selection.has(lone.id)).toBe(false);
    });

    test("Ctrl+A is not the tool's key", () => {
        const { tool } = buildSelectTest();
        const ctrlA = { code: 'KeyA', key: 'a', ctrl: true, shift: false, alt: false, repeat: false };

        const asTool: Tool = tool;

        expect(asTool.keyDown(ctrlA)).toBe(false);
    });
});

describe('SelectTool selection box', () => {
    test('a drag on empty space selects every entity the box touches, groups as wholes', () => {
        const { tool, selection, lone, group } = buildSelectTest();

        drag(tool, { x: 0, y: 300 }, { x: 330, y: 140 });

        expect(new Set(selection.ids)).toEqual(new Set([lone.id, group.id]));
    });

    test('the box replaces the selection, and with Shift held at the press adds to it', () => {
        const { tool, selection, lone, group } = buildSelectTest();
        selection.replace([group.id]);

        drag(tool, { x: 0, y: 0 }, { x: 60, y: 60 });
        expect(selection.ids).toEqual([lone.id]);

        selection.replace([group.id]);
        drag(tool, { x: 0, y: 0 }, { x: 60, y: 60 }, { shift: true });
        expect(selection.ids).toEqual([group.id, lone.id]);
    });

    test('Shift+drag starting on an entity draws a box instead of moving', () => {
        const { tool, selection, lone, group } = buildSelectTest();
        selection.replace([group.id]);

        drag(tool, { x: 100, y: 100 }, { x: 120, y: 120 }, { shift: true });

        expect(selection.ids).toEqual([group.id, lone.id]);
    });

    test('Ctrl selects the entities inside groups instead of their groups', () => {
        const { tool, selection, left, deep } = buildSelectTest();

        drag(tool, { x: 300, y: 300 }, { x: 600, y: 140 }, { ctrl: true });

        expect(new Set(selection.ids)).toEqual(new Set([left.id, deep.id]));
    });

    test('the box is shown while dragged, and the preview moves', () => {
        const { tool } = buildSelectTest();
        const versionBefore = tool.preview.version;

        tool.pointerDown(pointer({ x: 0, y: 0 }));
        tool.pointerMove(pointer({ x: 30, y: -20 }));

        expect(tool.selectionBox).toMatchObject({ left: 0, top: -20, right: 30, bottom: 0 });
        expect(tool.preview.version).toBeGreaterThan(versionBefore);

        tool.pointerUp(pointer({ x: 30, y: -20 }));
        expect(tool.selectionBox).toBeUndefined();
    });

    test('Esc cancels the box: nothing changes and the release is ignored', () => {
        const { tool, selection, lone } = buildSelectTest();
        selection.replace([lone.id]);

        tool.pointerDown(pointer({ x: 0, y: 140 }));
        tool.pointerMove(pointer({ x: 600, y: 300 }));

        expect(tool.cancel()).toBe(true);
        expect(tool.selectionBox).toBeUndefined();
        expect(tool.cancel()).toBe(false);

        tool.pointerUp(pointer({ x: 600, y: 300 }));
        expect(selection.ids).toEqual([lone.id]);
    });

    test('Esc during a press keeps the release from being a click', () => {
        const { tool, selection, lone } = buildSelectTest();
        selection.replace([lone.id]);

        tool.pointerDown(pointer({ x: -200, y: 300 }));
        expect(tool.cancel()).toBe(true);
        tool.pointerUp(pointer({ x: -200, y: 300 }));

        expect(selection.ids).toEqual([lone.id]);
    });
});

describe('SelectTool groups', () => {
    test('a double-click on a group goes into it and selects the child under the mouse', () => {
        const { tool, selection, currentGroup, group, innerGroup, deep } = buildSelectTest();

        doubleClick(tool, { x: 450, y: 100 });
        expect(currentGroup.group).toBe(group);
        expect(selection.ids).toEqual([innerGroup.id]);

        doubleClick(tool, { x: 450, y: 100 });
        expect(currentGroup.group).toBe(innerGroup);
        expect(selection.ids).toEqual([deep.id]);
    });

    test('inside a group, clicks select its direct children', () => {
        const { tool, selection, currentGroup, group, left } = buildSelectTest();
        currentGroup.enter(group);

        click(tool, { x: 350, y: 100 });

        expect(selection.ids).toEqual([left.id]);
    });

    test('a click outside the current group clears the selection and stays inside', () => {
        const { tool, selection, currentGroup, group, left } = buildSelectTest();
        currentGroup.enter(group);
        selection.replace([left.id]);

        click(tool, { x: 100, y: 100 });

        expect(selection.isEmpty).toBe(true);
        expect(currentGroup.group).toBe(group);
    });

    test('a double-click outside the current group goes up one group and selects the group left', () => {
        const { tool, selection, currentGroup, level, group } = buildSelectTest();
        currentGroup.enter(group);

        doubleClick(tool, { x: 100, y: 100 });

        expect(currentGroup.group).toBe(level.world);
        expect(selection.ids).toEqual([group.id]);
    });

    test('a double-click on empty space inside a group goes up one group', () => {
        const { tool, selection, currentGroup, group, innerGroup } = buildSelectTest();
        currentGroup.enter(innerGroup);

        doubleClick(tool, { x: -200, y: 300 });

        expect(currentGroup.group).toBe(group);
        expect(selection.ids).toEqual([innerGroup.id]);
    });

    test('a double-click on empty space in the World clears the selection and stays', () => {
        const { tool, selection, currentGroup, level, lone } = buildSelectTest();
        selection.replace([lone.id]);

        doubleClick(tool, { x: -200, y: 300 });

        expect(currentGroup.group).toBe(level.world);
        expect(selection.isEmpty).toBe(true);
    });

    test('a double-click on a shape only selects it', () => {
        const { tool, selection, currentGroup, level, lone } = buildSelectTest();

        doubleClick(tool, { x: 100, y: 100 });

        expect(currentGroup.group).toBe(level.world);
        expect(selection.ids).toEqual([lone.id]);
    });

    test('a double-click on the camera frame goes into the camera, reaching the entities inside it', () => {
        const { tool, selection, currentGroup, level, score } = buildSelectTest();

        click(tool, { x: -300, y: -200 });
        expect(selection.isEmpty).toBe(true);

        doubleClick(tool, { x: 960, y: 0 });
        expect(currentGroup.group).toBe(level.camera);
        expect(selection.isEmpty).toBe(true);

        click(tool, { x: -300, y: -200 });
        expect(selection.ids).toEqual([score.id]);
    });
});

import { describe, expect, test } from 'vitest';

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import { createCommandRegistry } from '../../commands/index.ts';
import { EditorSession } from '../../session/index.ts';
import { GridSnapper } from '../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import type { LevelPointerInput } from '../Tool.ts';

import { SelectTool } from './SelectTool.ts';

// A 100 px square at 100, 100, its frame from 50 to 150, selected. Screen and level are the same at zoom 1.
function buildCursorTest(rotation = 0) {
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    const transform = new TransformComponent();
    transform.set('position', { x: 100, y: 100 });
    transform.set('rotation', rotation);
    square.addComponent(transform);
    square.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 100, height: 100 } }));
    square.addComponent(new StyleComponent());

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.view.setSize(800, 600);
    const tool = new SelectTool();
    tool.activate({
        get openLevel() {
            return session.openLevel;
        },
        view: session.view,
        viewSettings: session.viewSettings,
        snapper: new GridSnapper(level.editorData, session.viewSettings),
        commands: createCommandRegistry(session),
        status: session.status,
        reader: session.reader,
        finished: () => {},
    });
    session.openLevel.selection.replace([square.id]);

    return { tool, session };
}

function pointer(position: Point): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: 'left',
        modifiers: { shift: false, alt: false, ctrl: false },
        clickCount: 1,
    };
}

describe("the Select tool's cursor", () => {
    test('is the turning arrow just outside a corner, during the turn too, and the default elsewhere', () => {
        const { tool } = buildCursorTest();

        tool.pointerMove(pointer({ x: 100, y: 100 }));
        expect(tool.cursor).toEqual({ kind: 'default' });

        const outsideCorner = { x: 160, y: 160 };
        tool.pointerMove(pointer(outsideCorner));
        expect(tool.cursor).toEqual({ kind: 'rotate' });

        tool.pointerDown(pointer(outsideCorner));
        tool.pointerMove(pointer({ x: 300, y: 300 }));
        expect(tool.cursor).toEqual({ kind: 'rotate' });

        tool.pointerUp(pointer({ x: 300, y: 300 }));
        expect(tool.cursor).toEqual({ kind: 'default' });
    });

    test('is a two-way arrow along the handle on a frame handle, turned with the entity', () => {
        const { tool } = buildCursorTest();

        tool.pointerMove(pointer({ x: 150, y: 100 }));
        expect(tool.cursor).toEqual({ kind: 'resize', directionDegrees: 0 });

        tool.pointerMove(pointer({ x: 150, y: 150 }));
        expect(tool.cursor).toEqual({ kind: 'resize', directionDegrees: 45 });

        const turned = buildCursorTest(90);
        turned.tool.pointerMove(pointer({ x: 100, y: 150 }));
        const cursor = turned.tool.cursor;
        if (cursor.kind !== 'resize') throw new Error('Not a resize cursor.');
        expect(cursor.directionDegrees).toBeCloseTo(90);
    });

    test('with nothing selected, is the default everywhere', () => {
        const { tool, session } = buildCursorTest();
        session.openLevel.selection.replace([]);

        tool.pointerMove(pointer({ x: 160, y: 160 }));

        expect(tool.cursor).toEqual({ kind: 'default' });
    });
});

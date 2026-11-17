import { describe, expect, test } from 'vitest';
import { MousePosition } from '../editor/tools/index.ts';
import { addSquare, buildJointTest, click, onlyJoint, pointer } from '../editor/tools/joint/testing/jointToolTest.ts';
import { ManualFrames } from '../editor/time/testing/index.ts';
import type { Point } from '../core/geometry/index.ts';

import { EditorJointPreviewSource } from './EditorJointPreviewSource.ts';

function buildSource() {
    const setup = buildJointTest();
    const frames = new ManualFrames();
    const mouse = new MousePosition(frames);
    const source = new EditorJointPreviewSource(setup.session, setup.controller, mouse);
    let changes = 0;
    source.subscribe(() => {
        changes += 1;
    });

    const moveMouseTo = (point: Point) => {
        mouse.moveTo(point);
        frames.runFrame();
    };

    return { ...setup, source, moveMouseTo, changes: () => changes };
}

// A wheel over a car, hinged where they overlap; the Select tool is back afterwards.
function placeHinge(setup: ReturnType<typeof buildSource>) {
    const car = addSquare(setup, { name: 'Car', at: { x: 0, y: 0 }, size: 100 });
    const wheel = addSquare(setup, { name: 'Wheel', at: { x: 40, y: 40 }, size: 20 });
    click(setup, { x: 40, y: 40 });

    return { car, wheel, joint: onlyJoint(setup) };
}

describe('EditorJointPreviewSource', () => {
    test('the Joint tool’s preview names the entities a click would join', () => {
        const setup = buildSource();
        const car = addSquare(setup, { name: 'Car', at: { x: 0, y: 0 }, size: 100 });
        const wheel = addSquare(setup, { name: 'Wheel', at: { x: 40, y: 40 }, size: 20 });

        setup.controller.pointerMove(pointer({ x: 40, y: 40 }));

        const preview = setup.source.preview;
        expect(preview?.a).toBe(wheel);
        expect(preview?.b).toBe(car);
        expect(preview?.label).toBe('Hinge: Wheel to Car');
    });

    test('a pin’s b is the background', () => {
        const setup = buildSource();
        setup.tool.chooseType('rope');
        addSquare(setup, { name: 'Lamp', at: { x: 0, y: 0 }, size: 20 });
        click(setup, { x: 0, y: 0 });

        setup.controller.pointerMove(pointer({ x: 300, y: 300 }));

        expect(setup.source.preview?.b).toBeNull();
        expect(setup.source.preview?.ends).toEqual([{ x: 0, y: 0 }]);
    });

    test('there is no preview under the Select tool', () => {
        const setup = buildSource();
        setup.controller.returnToSelect();

        expect(setup.source.preview).toBeUndefined();
    });

    test('a selected joint has its lines, and so has the joint under the mouse', () => {
        const setup = buildSource();
        const { joint } = placeHinge(setup);
        expect(setup.controller.active.id).toBe('select');
        expect(setup.source.linkedJoints).toEqual([joint]);

        setup.session.openLevel.selection.clear();
        expect(setup.source.linkedJoints).toEqual([]);

        setup.moveMouseTo({ x: 40, y: 40 });
        expect(setup.source.linkedJoints).toEqual([joint]);

        setup.moveMouseTo({ x: 300, y: 300 });
        expect(setup.source.linkedJoints).toEqual([]);
    });

    test('moving the mouse changes the source only when the joint under it changes', () => {
        const setup = buildSource();
        placeHinge(setup);
        setup.session.openLevel.selection.clear();
        setup.moveMouseTo({ x: 300, y: 300 });
        const before = setup.changes();

        setup.moveMouseTo({ x: 310, y: 300 });
        expect(setup.changes()).toBe(before);

        setup.moveMouseTo({ x: 40, y: 40 });
        expect(setup.changes()).toBe(before + 1);
    });

    test('a hidden joint has no lines', () => {
        const setup = buildSource();
        const { joint } = placeHinge(setup);

        joint.setHidden(true);

        expect(setup.source.linkedJoints).toEqual([]);
    });
});

import { describe, expect, test } from 'vitest';

import { BodyComponent, JointComponent, TransformComponent } from '../../../core/components/index.ts';
import { TENS_SNAPPER } from '../shape/testing/shapeToolTest.ts';
import { toolKey } from '../testing/toolTestSession.ts';

import { NOTHING_HERE } from './JointTool.ts';
import { addSquare, buildJointTest, click, endInLevel, joints, onlyJoint, pointer } from './testing/jointToolTest.ts';

describe('JointTool, a Hinge', () => {
    test('two overlapping bodies give a Hinge with the smaller as A, whatever the draw order', () => {
        const setup = buildJointTest();
        const wheel = addSquare(setup, { name: 'Wheel', at: { x: 200, y: 200 }, size: 40 });
        const car = addSquare(setup, { name: 'Car', at: { x: 220, y: 200 }, size: 200 });

        click(setup, { x: 210, y: 195 });

        const joint = onlyJoint(setup).requireComponent(JointComponent);
        expect(joint.get('type')).toBe('hinge');
        expect(joint.get('a')).toBe(wheel.id);
        expect(joint.get('b')).toBe(car.id);
        expect(onlyJoint(setup).requireComponent(TransformComponent).get('position')).toEqual({ x: 210, y: 195 });
    });

    test('one body gives a pin, B empty', () => {
        const setup = buildJointTest();
        const door = addSquare(setup, { name: 'Door', at: { x: 300, y: 300 }, size: 100 });

        click(setup, { x: 310, y: 290 });

        const joint = onlyJoint(setup).requireComponent(JointComponent);
        expect(joint.get('a')).toBe(door.id);
        expect(joint.get('b')).toBeNull();
    });

    test('a click on nothing makes nothing and shows the hint', () => {
        const setup = buildJointTest();
        addSquare(setup, { name: 'Box', at: { x: 300, y: 300 }, size: 100 });

        click(setup, { x: 50, y: 50 });

        expect(joints(setup)).toEqual([]);
        expect(setup.session.status.current).toBe(NOTHING_HERE);
        expect(setup.controller.active.id).toBe('joint');
    });

    test('entities without physics are skipped, and a surface with no body is an end', () => {
        const setup = buildJointTest();
        const ground = addSquare(setup, { name: 'Ground', at: { x: 300, y: 300 }, size: 200, physics: 'surface' });
        addSquare(setup, { name: 'Picture', at: { x: 300, y: 300 }, size: 50, physics: 'none' });

        click(setup, { x: 300, y: 300 });

        const joint = onlyJoint(setup).requireComponent(JointComponent);
        expect(joint.get('a')).toBe(ground.id);
        expect(joint.get('b')).toBeNull();
    });

    test('two merged shapes of one body count as one, so the click pins it', () => {
        const setup = buildJointTest();
        const car = setup.level.createEntity(setup.level.world, 0);
        car.addComponent(new TransformComponent());
        car.addComponent(new BodyComponent());
        addSquare(setup, { name: 'Front', at: { x: 100, y: 100 }, size: 100, physics: 'surface', parent: car });
        addSquare(setup, { name: 'Back', at: { x: 140, y: 100 }, size: 100, physics: 'surface', parent: car });

        click(setup, { x: 120, y: 100 });

        const joint = onlyJoint(setup).requireComponent(JointComponent);
        expect(joint.get('a')).toBe(car.id);
        expect(joint.get('b')).toBeNull();
    });

    test('hidden and locked entities are passed through', () => {
        const setup = buildJointTest();
        const box = addSquare(setup, { name: 'Box', at: { x: 300, y: 300 }, size: 200 });
        const hidden = addSquare(setup, { name: 'Hidden', at: { x: 300, y: 300 }, size: 20 });
        const locked = addSquare(setup, { name: 'Locked', at: { x: 300, y: 300 }, size: 30 });
        hidden.setHidden(true);
        locked.setLocked(true);

        click(setup, { x: 300, y: 300 });

        expect(onlyJoint(setup).requireComponent(JointComponent).get('a')).toBe(box.id);
    });

    test('the joint is selected and the tool returns to Select, or stays when locked', () => {
        const setup = buildJointTest();
        addSquare(setup, { name: 'Box', at: { x: 300, y: 300 }, size: 100 });

        click(setup, { x: 300, y: 300 });
        expect(setup.session.openLevel.selection.ids).toEqual([onlyJoint(setup).id]);
        expect(setup.controller.active.id).toBe('select');

        setup.controller.pick('joint');
        setup.controller.pick('joint');
        click(setup, { x: 300, y: 300 });
        expect(joints(setup)).toHaveLength(2);
        expect(setup.controller.active.id).toBe('joint');
    });

    test('the preview names what a click joins', () => {
        const setup = buildJointTest();
        addSquare(setup, { name: 'Car', at: { x: 220, y: 200 }, size: 200 });
        addSquare(setup, { name: 'Wheel', at: { x: 200, y: 200 }, size: 40 });

        setup.controller.pointerMove(pointer({ x: 200, y: 200 }));
        expect(setup.tool.drawing?.label).toBe('Hinge: Wheel to Car');

        setup.controller.pointerMove(pointer({ x: 300, y: 250 }));
        expect(setup.tool.drawing?.label).toBe('Hinge: Car to background');

        setup.controller.pointerMove(pointer({ x: 700, y: 550 }));
        expect(setup.tool.drawing?.label).toBeUndefined();
    });
});

describe('JointTool, a Rope or Spring', () => {
    test('two clicks give a Rope with each end where clicked, the smaller body as A', () => {
        const setup = buildJointTest();
        const ceiling = addSquare(setup, { name: 'Ceiling', at: { x: 400, y: 100 }, size: 150 });
        const cage = addSquare(setup, { name: 'Cage', at: { x: 400, y: 400 }, size: 60 });
        setup.tool.chooseType('rope');

        click(setup, { x: 410, y: 120 });
        expect(joints(setup)).toEqual([]);
        expect(setup.tool.hint).toContain('second');
        click(setup, { x: 390, y: 380 });

        const entity = onlyJoint(setup);
        const joint = entity.requireComponent(JointComponent);
        expect(joint.get('type')).toBe('rope');
        expect(joint.get('a')).toBe(cage.id);
        expect(joint.get('b')).toBe(ceiling.id);
        expect(endInLevel(setup, entity, 'a')).toEqual({ x: 390, y: 380 });
        expect(endInLevel(setup, entity, 'b')).toEqual({ x: 410, y: 120 });
    });

    test('a second click on the same body waits, and one on empty space pins B to the background', () => {
        const setup = buildJointTest();
        const lamp = addSquare(setup, { name: 'Lamp', at: { x: 400, y: 400 }, size: 60 });
        setup.tool.chooseType('spring');

        click(setup, { x: 400, y: 400 });
        click(setup, { x: 410, y: 410 });
        expect(joints(setup)).toEqual([]);

        setup.controller.pointerMove(pointer({ x: 400, y: 100 }));
        expect(setup.tool.drawing?.label).toBe('Spring: Lamp to background');
        click(setup, { x: 400, y: 100 });

        const entity = onlyJoint(setup);
        const joint = entity.requireComponent(JointComponent);
        expect(joint.get('a')).toBe(lamp.id);
        expect(joint.get('b')).toBeNull();
        expect(endInLevel(setup, entity, 'b')).toEqual({ x: 400, y: 100 });
    });

    test('a first click needs a body', () => {
        const setup = buildJointTest();
        setup.tool.chooseType('rope');

        click(setup, { x: 100, y: 100 });

        expect(setup.session.status.current).toBe(NOTHING_HERE);
        expect(setup.tool.hint).toBe('Click the first entity, then the second.');
    });

    test('Esc drops a first click', () => {
        const setup = buildJointTest();
        addSquare(setup, { name: 'Lamp', at: { x: 400, y: 400 }, size: 60 });
        setup.tool.chooseType('rope');
        click(setup, { x: 400, y: 400 });

        expect(setup.tool.cancel()).toBe(true);
        expect(setup.tool.cancel()).toBe(false);
        click(setup, { x: 100, y: 100 });

        expect(joints(setup)).toEqual([]);
        expect(setup.session.status.current).toBe(NOTHING_HERE);
    });
});

type Skip = 'no body' | 'hidden' | 'locked';

const SKIPS: readonly { readonly skip: Skip; readonly reason: string }[] = [
    { skip: 'no body', reason: 'Platform has no BodyComponent' },
    { skip: 'hidden', reason: 'Platform is hidden' },
    { skip: 'locked', reason: 'Platform is locked' },
];

// A square named Platform at (400, 300) that the Joint tool skips for the given reason.
function addSkipped(setup: ReturnType<typeof buildJointTest>, skip: Skip) {
    const physics = skip === 'no body' ? 'none' : 'body';
    const platform = addSquare(setup, { name: 'Platform', at: { x: 400, y: 300 }, size: 100, physics });
    platform.setHidden(skip === 'hidden');
    platform.setLocked(skip === 'locked');

    return platform;
}

describe('JointTool says why it skips an entity', () => {
    test.each(SKIPS)('a Hinge over $skip: the label and the click say "$reason"', ({ skip, reason }) => {
        const setup = buildJointTest();
        addSkipped(setup, skip);

        setup.controller.pointerMove(pointer({ x: 400, y: 300 }));
        expect(setup.tool.drawing?.label).toBe(reason);
        expect(setup.tool.drawing?.a).toBeUndefined();

        click(setup, { x: 400, y: 300 });
        expect(joints(setup)).toEqual([]);
        expect(setup.session.status.current).toBe(reason);
        expect(setup.controller.active.id).toBe('joint');
    });

    test.each(SKIPS)('a Rope\'s first end over $skip says "$reason" and starts nothing', ({ skip, reason }) => {
        const setup = buildJointTest();
        addSkipped(setup, skip);
        setup.tool.chooseType('rope');

        setup.controller.pointerMove(pointer({ x: 400, y: 300 }));
        expect(setup.tool.drawing?.label).toBe(reason);

        click(setup, { x: 400, y: 300 });
        expect(setup.session.status.current).toBe(reason);
        expect(setup.tool.hint).toBe('Click the first entity, then the second.');
    });

    test.each(SKIPS)('a Spring\'s second end over $skip is refused with "$reason"', ({ skip, reason }) => {
        const setup = buildJointTest();
        const lamp = addSquare(setup, { name: 'Lamp', at: { x: 100, y: 100 }, size: 60 });
        addSkipped(setup, skip);
        setup.tool.chooseType('spring');
        click(setup, { x: 100, y: 100 });

        setup.controller.pointerMove(pointer({ x: 400, y: 300 }));
        expect(setup.tool.drawing?.label).toBe(reason);
        expect(setup.tool.drawing?.a).toBe(lamp.id);
        expect(setup.tool.drawing?.ends).toEqual([{ x: 100, y: 100 }]);

        click(setup, { x: 400, y: 300 });
        expect(joints(setup)).toEqual([]);
        expect(setup.session.status.current).toBe(reason);

        click(setup, { x: 700, y: 550 });
        const joint = onlyJoint(setup).requireComponent(JointComponent);
        expect(joint.get('a')).toBe(lamp.id);
        expect(joint.get('b')).toBeNull();
    });

    test('a body under the mouse is still used, and the frontmost skipped entity is named', () => {
        const setup = buildJointTest();
        const box = addSquare(setup, { name: 'Box', at: { x: 400, y: 300 }, size: 200 });
        addSkipped(setup, 'locked');

        setup.controller.pointerMove(pointer({ x: 400, y: 300 }));
        expect(setup.tool.drawing?.label).toBe('Hinge: Box to background');

        setup.controller.pointerMove(pointer({ x: 50, y: 50 }));
        expect(setup.tool.drawing?.label).toBeUndefined();

        addSquare(setup, { name: 'Picture', at: { x: 400, y: 300 }, size: 20, physics: 'none' });
        box.setHidden(true);
        setup.controller.pointerMove(pointer({ x: 400, y: 300 }));
        expect(setup.tool.drawing?.label).toBe('Picture has no BodyComponent');
    });
});

describe('JointTool snapping', () => {
    test('an end lands on a corner 4 screen px away', () => {
        const setup = buildJointTest(TENS_SNAPPER);
        addSquare(setup, { name: 'Box', at: { x: 303, y: 303 }, size: 100 });

        click(setup, { x: 356, y: 350 });

        expect(onlyJoint(setup).requireComponent(TransformComponent).get('position')).toEqual({ x: 353, y: 353 });
    });

    test('away from the entities the grid snaps, and Ctrl turns both off', () => {
        const setup = buildJointTest(TENS_SNAPPER);
        addSquare(setup, { name: 'Box', at: { x: 303, y: 303 }, size: 100 });

        setup.controller.pointerMove(pointer({ x: 322, y: 318 }));
        expect(setup.tool.drawing?.mouse).toEqual({ x: 320, y: 320 });

        setup.controller.keyDown({ ...toolKey('ControlLeft', 'Control'), ctrl: true });
        expect(setup.tool.drawing?.mouse).toEqual({ x: 322, y: 318 });

        click(setup, { x: 356, y: 350 }, { ctrl: true });
        expect(onlyJoint(setup).requireComponent(TransformComponent).get('position')).toEqual({ x: 356, y: 350 });
    });
});

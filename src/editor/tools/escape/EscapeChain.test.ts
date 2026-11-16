import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../../core/components/index.ts';
import { buildToolTestSession, pointerAt, toolKey } from '../testing/toolTestSession.ts';

import { EscapeChain } from './EscapeChain.ts';

function buildChain() {
    const parts = buildToolTestSession();
    const windows = { open: false, isOpen: () => windows.open };
    const escape = new EscapeChain(parts.session, parts.controller, windows);

    return { ...parts, windows, escape };
}

describe('EscapeChain', () => {
    test('gives each of the six answers in turn, the earlier ones done or absent', () => {
        const { escape, controller, shape, square, group, session, windows } = buildChain();
        const openLevel = session.openLevel;
        const squarePosition = { entityId: square.id, schema: TransformComponent.schema, key: 'position' };

        openLevel.currentGroup.enter(group);
        openLevel.selection.replace([square.id]);
        controller.pick('shape');
        shape.cancelAnswers = [true, true];
        controller.pointerDown(pointerAt({ x: 0, y: 0 }));
        openLevel.liveEdit.begin([squarePosition]);
        openLevel.liveEdit.update(squarePosition, { x: 40, y: 0 });
        windows.open = true;

        expect(escape.press()).toBe('drag');
        expect(openLevel.liveEdit.isActive).toBe(false);
        expect(square.requireComponent(TransformComponent).get('position')).toEqual({ x: 0, y: 0 });

        expect(escape.press()).toBe('window');
        windows.open = false;

        expect(escape.press()).toBe('drawing');
        expect(escape.press()).toBe('tool');
        expect(controller.active.id).toBe('select');

        expect(escape.press()).toBe('group');
        expect(openLevel.currentGroup.group).toBe(session.openLevel.level.world);
        expect(openLevel.selection.ids).toEqual([group.id]);

        expect(escape.press()).toBe('selection');
        expect(openLevel.selection.isEmpty).toBe(true);

        expect(escape.press()).toBe('nothing');
        expect(openLevel.history.undoCount).toBe(0);
    });

    test('a cancelled drag ignores its release, so it never ends as a click', () => {
        const { escape, controller, select } = buildChain();

        controller.pointerDown(pointerAt({ x: 0, y: 0 }));
        expect(escape.press()).toBe('drag');
        controller.pointerUp(pointerAt({ x: 0, y: 0 }));

        expect(select.heard).toEqual(['activate', 'down left', 'cancel']);
    });

    test('a pan in progress is the drag Esc stops', () => {
        const { escape, controller, session } = buildChain();

        controller.pointerDown(pointerAt({ x: 0, y: 0 }, 'middle'));
        expect(escape.press()).toBe('drag');
        controller.pointerMove(pointerAt({ x: 50, y: 0 }));

        expect(session.view.middle).toEqual({ x: 0, y: 0 });
    });

    test('a locked tool is ended by Esc and returns to Select', () => {
        const { escape, controller } = buildChain();

        controller.pick('shape');
        controller.pick('shape');

        expect(escape.press()).toBe('tool');
        expect(controller.active.id).toBe('select');
        expect(controller.isLocked).toBe(false);
    });

    test('a locked Select drops its lock and goes on down the chain', () => {
        const { escape, controller, session, group } = buildChain();
        session.openLevel.selection.replace([group.id]);
        controller.pick('select');

        expect(escape.press()).toBe('selection');
        expect(controller.isLocked).toBe(false);
    });

    test('inside a group Esc walks outward and never only deselects', () => {
        const { escape, session, group, square } = buildChain();
        const openLevel = session.openLevel;
        openLevel.currentGroup.enter(group);
        openLevel.selection.replace([square.id]);

        expect(escape.press()).toBe('group');
        expect(openLevel.selection.ids).toEqual([group.id]);
    });

    test('losing focus mid-drag puts the drag back and lets go of Space', () => {
        const { escape, controller, select, session, square } = buildChain();
        const openLevel = session.openLevel;
        const squarePosition = { entityId: square.id, schema: TransformComponent.schema, key: 'position' };

        controller.pointerDown(pointerAt({ x: 0, y: 0 }));
        openLevel.liveEdit.begin([squarePosition]);
        openLevel.liveEdit.update(squarePosition, { x: 40, y: 0 });
        escape.focusLost();
        controller.pointerUp(pointerAt({ x: 40, y: 0 }));

        expect(select.heard).toEqual(['activate', 'down left', 'cancel']);
        expect(openLevel.liveEdit.isActive).toBe(false);
        expect(square.requireComponent(TransformComponent).get('position')).toEqual({ x: 0, y: 0 });
        expect(openLevel.history.undoCount).toBe(0);
    });

    test('losing focus with Space held and no drag lets go of Space', () => {
        const { escape, controller, pan, select } = buildChain();

        controller.keyDown(toolKey('Space', ' '));
        escape.focusLost();
        controller.pointerDown(pointerAt({ x: 0, y: 0 }));

        expect(pan.isSpaceHeld).toBe(false);
        expect(select.heard).toEqual(['activate', 'down left']);
    });

    test('the browser taking the pointer puts a pan back to rest', () => {
        const { escape, controller, session } = buildChain();

        controller.pointerDown(pointerAt({ x: 0, y: 0 }, 'middle'));
        escape.dragLost();
        controller.pointerMove(pointerAt({ x: 50, y: 0 }));

        expect(controller.isDragging).toBe(false);
        expect(session.view.middle).toEqual({ x: 0, y: 0 });
    });
});

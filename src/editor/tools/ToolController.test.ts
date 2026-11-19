import { describe, expect, test } from 'vitest';

import { ShapeComponent, StyleComponent } from '../../core/components/index.ts';
import type { EntityId } from '../../core/level/index.ts';
import { pointerAt, buildToolTestSession, toolKey } from './testing/toolTestSession.ts';
import { PICK_TEXT } from './ToolController.ts';

const SPACE = toolKey('Space', ' ');

describe('ToolController', () => {
    test('starts on Select, activated with the context', () => {
        const { controller, select } = buildToolTestSession();

        expect(controller.active).toBe(select);
        expect(controller.isLocked).toBe(false);
        expect(select.heard).toEqual(['activate']);
        expect(select.context?.view).toBeDefined();
    });

    test('picking another tool deactivates the old one; picking the active tool again locks it', () => {
        const { controller, select, shape } = buildToolTestSession();

        controller.pick('shape');
        expect(controller.active).toBe(shape);
        expect(select.heard).toEqual(['activate', 'deactivate']);
        expect(controller.isLocked).toBe(false);

        const versionBefore = controller.version.version;
        controller.pick('shape');
        expect(controller.isLocked).toBe(true);
        expect(controller.version.version).toBe(versionBefore + 1);
        expect(shape.heard).toEqual(['activate']);

        controller.pick('select');
        expect(controller.active).toBe(select);
        expect(controller.isLocked).toBe(false);
    });

    test('an unknown or missing tool throws', () => {
        const { controller } = buildToolTestSession();

        expect(() => controller.pick('joint')).toThrow('No tool has the id joint.');
    });

    test('finishing selects what was made and returns to Select, unless locked', () => {
        const { controller, shape, square, session } = buildToolTestSession();

        controller.pick('shape');
        shape.context?.finished([square.id]);
        expect(session.openLevel.selection.ids).toEqual([square.id]);
        expect(controller.active.id).toBe('select');

        controller.pick('shape');
        controller.pick('shape');
        shape.context?.finished([square.id]);
        expect(controller.active.id).toBe('shape');
        expect(controller.isLocked).toBe(true);
    });

    test('the context reads the open level when used, so a replaced level reaches the tools', () => {
        const { controller, select, session, level } = buildToolTestSession();
        const firstContext = select.context;

        session.replaceOpenLevel(level);

        expect(controller.active).toBe(select);
        expect(firstContext?.openLevel).toBe(session.openLevel);
    });

    test('the pointer reaches the active tool, and a release it never saw go down is dropped', () => {
        const { controller, select } = buildToolTestSession();

        controller.pointerDown(pointerAt({ x: 10, y: 10 }));
        controller.pointerMove(pointerAt({ x: 20, y: 10 }));
        controller.pointerUp(pointerAt({ x: 20, y: 10 }));
        controller.pointerUp(pointerAt({ x: 20, y: 10 }, 'right'));

        expect(select.heard).toEqual(['activate', 'down left', 'move', 'up left']);
    });

    test('Space pans and returns to the tool on release', () => {
        const { controller, select, session } = buildToolTestSession();
        const middleBefore = session.view.middle;

        expect(controller.keyDown(SPACE)).toBe(true);
        controller.pointerDown(pointerAt({ x: 100, y: 100 }));
        controller.pointerMove(pointerAt({ x: 150, y: 80 }));
        controller.pointerUp(pointerAt({ x: 150, y: 80 }));
        controller.keyUp(SPACE);

        expect(session.view.middle).toEqual({ x: middleBefore.x - 50, y: middleBefore.y + 20 });
        expect(select.heard).toEqual(['activate', 'keyUp Space']);

        controller.pointerDown(pointerAt({ x: 10, y: 10 }));
        expect(select.heard.at(-1)).toBe('down left');
        expect(controller.active).toBe(select);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('a held Space repeating stays used, so the page never scrolls', () => {
        const { controller } = buildToolTestSession();

        controller.keyDown(SPACE);
        const repeated = controller.keyDown({ ...SPACE, repeat: true });

        expect(repeated).toBe(true);
    });

    test('a middle drag pans during a tool drag, and the tool hears the mouse where the level moved', () => {
        const { controller, select, session } = buildToolTestSession();

        controller.pointerDown(pointerAt({ x: 100, y: 100 }));
        controller.pointerDown(pointerAt({ x: 100, y: 100 }, 'middle'));
        controller.pointerMove(pointerAt({ x: 130, y: 100 }));
        controller.pointerUp(pointerAt({ x: 130, y: 100 }, 'middle'));
        controller.pointerUp(pointerAt({ x: 130, y: 100 }));

        expect(select.heard).toEqual(['activate', 'down left', 'move', 'up left']);
        const heardMove = select.moves[0];
        const expectedLevelPosition = session.view.screenToLevel({ x: 130, y: 100 });
        expect(heardMove?.levelPosition).toEqual(expectedLevelPosition);
    });

    test('a middle drag with no tool drag pans without telling the tool', () => {
        const { controller, select } = buildToolTestSession();

        controller.pointerDown(pointerAt({ x: 100, y: 100 }, 'middle'));
        controller.pointerMove(pointerAt({ x: 130, y: 100 }));
        controller.pointerUp(pointerAt({ x: 130, y: 100 }, 'middle'));

        expect(select.heard).toEqual(['activate']);
    });

    test('keys go to the tool, which says whether it used them', () => {
        const { controller, select } = buildToolTestSession();
        select.usedKeys.add('Enter');

        expect(controller.keyDown(toolKey('Enter', 'Enter'))).toBe(true);
        expect(controller.keyDown(toolKey('KeyQ', 'q'))).toBe(false);
    });

    describe("the entity field's picker", () => {
        // The group's square gets a filled 100 px shape around the origin, so a click there hits it.
        function buildPickSession() {
            const parts = buildToolTestSession();
            const geometry = { kind: 'rectangle', width: 100, height: 100 } as const;
            parts.square.addComponent(new ShapeComponent({ geometry }));
            parts.square.addComponent(new StyleComponent());
            const picked: (EntityId | undefined)[] = [];
            const recordPick = (entityId: EntityId | undefined) => picked.push(entityId);

            return { ...parts, picked, recordPick };
        }

        test('the next click picks the entity inside its group, and the tool never hears it', () => {
            const { controller, select, square, picked, recordPick, session } = buildPickSession();

            controller.waitForPick(recordPick);
            expect(controller.isPicking).toBe(true);
            expect(session.status.current).toBe(PICK_TEXT);

            controller.pointerDown(pointerAt({ x: 10, y: 10 }));
            controller.pointerMove(pointerAt({ x: 12, y: 10 }));
            controller.pointerUp(pointerAt({ x: 12, y: 10 }));

            expect(picked).toEqual([square.id]);
            expect(controller.isPicking).toBe(false);
            expect(select.heard).toEqual(['activate', 'move']);
            expect(session.openLevel.selection.isEmpty).toBe(true);
        });

        test('a click on nothing ends it with nothing picked', () => {
            const { controller, picked, recordPick } = buildPickSession();

            controller.waitForPick(recordPick);
            controller.pointerDown(pointerAt({ x: 500, y: 500 }));

            expect(picked).toEqual([undefined]);
            expect(controller.isPicking).toBe(false);
        });

        test('a right click and a middle pan leave it waiting', () => {
            const { controller, picked, recordPick } = buildPickSession();

            controller.waitForPick(recordPick);
            controller.pointerDown(pointerAt({ x: 10, y: 10 }, 'right'));
            controller.pointerDown(pointerAt({ x: 10, y: 10 }, 'middle'));
            controller.pointerMove(pointerAt({ x: 40, y: 10 }));
            controller.pointerUp(pointerAt({ x: 40, y: 10 }, 'middle'));

            expect(picked).toEqual([]);
            expect(controller.isPicking).toBe(true);
        });

        test('Esc, picking a tool or the answer it was given ends it with nothing picked', () => {
            const { controller, select, picked, recordPick } = buildPickSession();

            controller.waitForPick(recordPick);
            expect(controller.cancelDrawing()).toBe(true);
            expect(controller.isPicking).toBe(false);
            expect(select.heard).toEqual(['activate']);

            controller.waitForPick(recordPick);
            controller.pick('shape');
            expect(controller.isPicking).toBe(false);

            const stopWaiting = controller.waitForPick(recordPick);
            stopWaiting();
            expect(controller.isPicking).toBe(false);
            expect(picked).toEqual([]);
        });

        test('an older answer never stops a newer picker', () => {
            const { controller, recordPick } = buildPickSession();

            const stopFirst = controller.waitForPick(recordPick);
            const pickSecond = () => {};
            controller.waitForPick(pickSecond);
            stopFirst();

            expect(controller.isPicking).toBe(true);
            expect(controller.isWaitingFor(pickSecond)).toBe(true);
            expect(controller.isWaitingFor(recordPick)).toBe(false);
        });
    });
});

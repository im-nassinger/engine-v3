import { describe, expect, test } from 'vitest';

import { BodyComponent, ShapeComponent, StyleComponent } from '../../../core/components/index.ts';
import type { Fill } from '../../../core/fields/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession } from '../testing/commandTestSession.ts';

import { FieldSlide } from './FieldSlide.ts';

function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());

    for (const crate of [built.square, built.child]) {
        crate.addComponent(new ShapeComponent());
        crate.addComponent(new BodyComponent());
    }

    const openLevel = built.session.openLevel;
    const entityIds = [built.square.id, built.child.id];
    const slide = new FieldSlide({ openLevel, entityIds, componentType: 'BodyComponent', key: 'linearDamping' });

    return { ...built, openLevel, slide };
}

function dampingOf(entity: Entity) {
    return entity.requireComponent(BodyComponent).get('linearDamping');
}

describe('FieldSlide', () => {
    test('a drag changes the level on every move and is one step on release', () => {
        const { openLevel, slide, square, child } = buildSession();
        const startDamping = dampingOf(square);

        slide.slideTo(1);
        slide.slideTo(2);
        expect(dampingOf(square)).toBe(2);
        expect(dampingOf(child)).toBe(2);
        expect(openLevel.history.undoCount).toBe(0);
        expect(openLevel.liveEdit.isActive).toBe(true);

        slide.release(3);
        expect(openLevel.liveEdit.isActive).toBe(false);
        expect(openLevel.history.undoCount).toBe(1);
        expect(openLevel.history.undoLabel).toBe('Change Linear damping');

        openLevel.editor.undo();
        expect(dampingOf(square)).toBe(startDamping);
        expect(dampingOf(child)).toBe(startDamping);
    });

    test('Esc during the drag puts the start values back and the release makes no step', () => {
        const { openLevel, slide, square } = buildSession();
        const startDamping = dampingOf(square);

        slide.slideTo(2);
        openLevel.liveEdit.cancel();
        slide.slideTo(3);
        expect(dampingOf(square)).toBe(startDamping);
        const outcome = slide.release(3);

        expect(outcome).toEqual({ kind: 'putBack' });
        expect(dampingOf(square)).toBe(startDamping);
        expect(openLevel.history.undoCount).toBe(0);
    });

    test('a release with no drag before it is one step, as typing is', () => {
        const { openLevel, slide, square } = buildSession();

        slide.release(4);

        expect(dampingOf(square)).toBe(4);
        expect(openLevel.history.undoCount).toBe(1);
    });

    test('a drag begun while another live edit runs only changes the level on release', () => {
        const { openLevel, slide, square } = buildSession();
        const startDamping = dampingOf(square);
        openLevel.liveEdit.begin([]);

        slide.slideTo(2);
        expect(dampingOf(square)).toBe(startDamping);

        openLevel.liveEdit.cancel();
        slide.release(2);
        expect(dampingOf(square)).toBe(2);
    });

    test('cancel puts the start values back with no step', () => {
        const { openLevel, slide, square } = buildSession();
        const startDamping = dampingOf(square);

        slide.slideTo(2);
        slide.cancel();

        expect(dampingOf(square)).toBe(startDamping);
        expect(openLevel.liveEdit.isActive).toBe(false);
        expect(openLevel.history.undoCount).toBe(0);
    });

    test('slides any field value, such as a gradient whose stop is dragged', () => {
        const { openLevel, square } = buildSession();
        square.addComponent(new StyleComponent());
        const style = square.requireComponent(StyleComponent);
        const componentType = 'StyleComponent';
        const fillSlide = new FieldSlide({ openLevel, entityIds: [square.id], componentType, key: 'fill' });
        const startFill = style.get('fill');
        const gradient = (place: number): Fill => ({
            kind: 'linear',
            stops: [
                { colour: '#FF0000FF', place: 0 },
                { colour: '#00FF00FF', place },
            ],
            start: { x: 0, y: 0.5 },
            end: { x: 1, y: 0.5 },
        });

        fillSlide.slideTo(gradient(0.5));
        expect(style.get('fill')).toEqual(gradient(0.5));
        expect(openLevel.history.undoCount).toBe(0);

        fillSlide.release(gradient(0.7));
        expect(openLevel.history.undoLabel).toBe('Change Fill');
        expect(openLevel.history.undoCount).toBe(1);

        openLevel.editor.undo();
        expect(style.get('fill')).toEqual(startFill);
    });
});

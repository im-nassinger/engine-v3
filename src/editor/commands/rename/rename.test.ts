import { describe, expect, test } from 'vitest';

import { NameComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';

import { renameEntity } from './renameEntity.ts';
import { renameLevel } from './renameLevel.ts';

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer);
}

function nameOf(entity: Entity) {
    return entity.requireComponent(NameComponent).get('name');
}

describe('renameEntity', () => {
    test('trims the name and passes the run, undo, redo round trip', () => {
        const { session, square } = buildSession();

        const trip = expectRoundTrip(session, () => renameEntity(session.openLevel, square.id, '  Box  '));

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(nameOf(square)).toBe('Box');
        expect(session.openLevel.history.undoLabel).toBe('Rename Square');
    });

    test('keeps the old name for an empty one, making no step', () => {
        const { session, square } = buildSession();

        const outcome = renameEntity(session.openLevel, square.id, '   ');

        expect(outcome).toEqual({ kind: 'done' });
        expect(nameOf(square)).toBe('Square');
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('makes no step for the same name', () => {
        const { session, square } = buildSession();

        renameEntity(session.openLevel, square.id, 'Square ');

        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('takes 64 characters and refuses 65, keeping the old name', () => {
        const { session, square } = buildSession();

        renameEntity(session.openLevel, square.id, 'a'.repeat(64));
        expect(nameOf(square)).toBe('a'.repeat(64));

        const outcome = renameEntity(session.openLevel, square.id, 'b'.repeat(65));
        expect(outcome).toEqual({ kind: 'refused', reason: 'A name can be at most 64 characters' });
        expect(nameOf(square)).toBe('a'.repeat(64));
    });

    test('renames the camera but refuses the World', () => {
        const { session, level } = buildSession();

        renameEntity(session.openLevel, level.camera.id, 'Eye');
        const outcome = renameEntity(session.openLevel, level.world.id, 'Earth');

        expect(nameOf(level.camera)).toBe('Eye');
        expect(outcome).toEqual({ kind: 'refused', reason: "The World can't be renamed" });
        expect(nameOf(level.world)).toBe('World');
    });
});

describe('renameLevel', () => {
    test('trims the name and passes the run, undo, redo round trip', () => {
        const { session, level } = buildSession();

        const trip = expectRoundTrip(session, () => renameLevel(session.openLevel, ' Caves '));

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(level.name).toBe('Caves');
        expect(session.openLevel.history.undoLabel).toBe('Rename level');
    });

    test('keeps the old name for an empty one or the same one, making no step', () => {
        const { session, level } = buildSession();

        expect(renameLevel(session.openLevel, '  ')).toEqual({ kind: 'done' });
        expect(renameLevel(session.openLevel, 'Untitled level')).toEqual({ kind: 'done' });

        expect(level.name).toBe('Untitled level');
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('refuses a name past 60 characters, not cutting it', () => {
        const { session, level } = buildSession();

        const outcome = renameLevel(session.openLevel, 'x'.repeat(61));

        expect(outcome).toEqual({ kind: 'refused', reason: 'A level name can be at most 60 characters' });
        expect(level.name).toBe('Untitled level');
    });
});

import { describe, expect, test } from 'vitest';

import { NameComponent, VariablesComponent } from '../../components/index.ts';
import type { VariableValue } from '../../fields/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import { playNumbers } from './playNumbers.ts';
import type { WaitingRun } from '../triggers/WaitingRuns.ts';

function giveVariables(entity: Entity, values: Readonly<Record<string, VariableValue>>) {
    const variables = Object.entries(values).map(([name, value]) => ({ name, value }));
    entity.addComponent(new VariablesComponent({ variables }));
}

function addEntity(level: Level, name: string) {
    const entity = level.createEntity(level.world, level.world.children.length);
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

function waitingRun(owner: Entity, nextAction: number, dueTick: number): WaitingRun {
    return {
        firing: { owner, triggerId: 1, when: { kind: 'levelStart' }, other: null },
        nextAction,
        dueTick,
        started: 0,
    };
}

describe('playNumbers', () => {
    test('is empty for a level with no variables and nothing waiting', () => {
        expect(playNumbers(Level.createNew(), [])).toEqual([]);
    });

    test("gives the World's numbers alone, as v3 hashed them", () => {
        const level = Level.createNew();
        giveVariables(level.world, { coins: 3, beats: -1.5 });

        expect(playNumbers(level, [])).toEqual([3, -1.5]);
    });

    test("marks the World's strings and booleans with their type", () => {
        const level = Level.createNew();
        giveVariables(level.world, { lights: true, word: 'ab' });

        expect(playNumbers(level, [])).toEqual([3, 1, 2, 2, 97, 98]);
    });

    test("adds each other entity's variables in Entities viewer order, with its id, count and types", () => {
        const level = Level.createNew();
        const door = addEntity(level, 'Door');
        addEntity(level, 'Plain');
        const ball = addEntity(level, 'Ball');
        giveVariables(door, { door_open: false });
        giveVariables(ball, { hits: 2, name: '' });

        expect(playNumbers(level, [])).toEqual([door.id, 1, 3, 0, ball.id, 2, 1, 2, 2, 0]);
    });

    test('tells a number, a string and a boolean of the same look apart', () => {
        const hashed = (value: VariableValue) => {
            const level = Level.createNew();
            giveVariables(addEntity(level, 'Box'), { value });

            return playNumbers(level, []);
        };

        expect(new Set([hashed(1), hashed('1'), hashed(true)].map((numbers) => numbers.join()))).toHaveProperty(
            'size',
            3,
        );
    });

    test('adds the waiting runs last, their count, then each due tick and action index in order', () => {
        const level = Level.createNew();
        giveVariables(level.world, { opened: 2 });

        expect(playNumbers(level, [waitingRun(level.world, 3, 216), waitingRun(level.world, 3, 276)])).toEqual([
            2, 2, 216, 3, 276, 3,
        ]);
    });
});

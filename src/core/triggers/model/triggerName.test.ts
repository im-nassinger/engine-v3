import { describe, expect, test } from 'vitest';

import type { Trigger, When } from '../../fields/index.ts';
import type { KeyCode } from '../../keys/index.ts';

import { triggerName } from './triggerName.ts';

function triggerOn(when: When | null, name: string | null = null): Trigger {
    return { id: 1, name, on: true, when, checks: [], actions: [] };
}

const NAMES: readonly (readonly [When | null, string])[] = [
    [{ kind: 'touched' }, 'Touched'],
    [{ kind: 'untouched' }, 'No longer touched'],
    [{ kind: 'input', input: 'jump', how: 'pressed' }, 'jump pressed'],
    [{ kind: 'input', input: null, how: 'held' }, 'Input held'],
    [{ kind: 'key', key: 'Space' as KeyCode, how: 'released' }, 'Space released'],
    [{ kind: 'key', key: null, how: 'pressed' }, 'Key pressed'],
    [{ kind: 'after', time: 60, unit: 'seconds' }, 'After 60 s'],
    [{ kind: 'after', time: null, unit: 'seconds' }, 'After a time'],
    [{ kind: 'every', time: 0.5, unit: 'seconds' }, 'Every 0.5 s'],
    [{ kind: 'levelStart' }, 'Level start'],
    [{ kind: 'custom', name: 'open' }, 'Gets open'],
    [{ kind: 'custom', name: null }, 'Gets an event'],
    [{ kind: 'variableChanged', variable: { owner: 'level', name: 'coins' }, becomes: null }, 'coins changes'],
    [
        {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'coins' },
            becomes: { compare: 'atLeast', value: 10 },
        },
        'coins becomes 10 or more',
    ],
    [
        {
            kind: 'variableChanged',
            variable: { owner: 'own', target: { kind: 'this' }, name: 'health' },
            becomes: { compare: 'less', value: 1 },
        },
        'health becomes less than 1',
    ],
    [
        {
            kind: 'variableChanged',
            variable: { owner: 'own', target: { kind: 'this' }, name: 'door_open' },
            becomes: { compare: 'is', value: true },
        },
        'door_open becomes true',
    ],
    [
        {
            kind: 'variableChanged',
            variable: { owner: 'level', name: 'mood' },
            becomes: { compare: 'isNot', value: 'calm' },
        },
        'mood becomes not "calm"',
    ],
    [{ kind: 'variableChanged', variable: null, becomes: null }, 'A variable changes'],
    [null, 'New trigger'],
];

describe('triggerName', () => {
    test.each(NAMES)('names the When %j "%s"', (when, name) => {
        expect(triggerName(triggerOn(when))).toBe(name);
    });

    test('a trigger with a name of its own keeps it', () => {
        expect(triggerName(triggerOn({ kind: 'touched' }, 'Coin'))).toBe('Coin');
    });
});

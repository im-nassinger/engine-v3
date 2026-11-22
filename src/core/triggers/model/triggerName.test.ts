import { describe, expect, test } from 'vitest';

import type { Trigger, When } from '../../fields/index.ts';
import type { KeyCode } from '../../keys/index.ts';

import { triggerName } from './triggerName.ts';

function triggerOn(when: When | null, name: string | null = null): Trigger {
    return { id: 1, name, on: true, when, checks: [], actions: [], repeat: { kind: 'everyTime' } };
}

const NAMES: readonly (readonly [When | null, string])[] = [
    [{ kind: 'touched' }, 'Touched'],
    [{ kind: 'untouched' }, 'No longer touched'],
    [{ kind: 'input', input: 'jump', how: 'pressed' }, 'jump pressed'],
    [{ kind: 'input', input: null, how: 'held' }, 'Input held'],
    [{ kind: 'key', key: 'Space' as KeyCode, how: 'released' }, 'Space released'],
    [{ kind: 'key', key: null, how: 'pressed' }, 'Key pressed'],
    [{ kind: 'after', seconds: 60 }, 'After 60 s'],
    [{ kind: 'after', seconds: null }, 'After a time'],
    [{ kind: 'every', seconds: 0.5 }, 'Every 0.5 s'],
    [{ kind: 'levelStart' }, 'Level start'],
    [{ kind: 'tagLeft', tag: 'coin' }, 'No coin left'],
    [{ kind: 'tagLeft', tag: null }, 'No tag left'],
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

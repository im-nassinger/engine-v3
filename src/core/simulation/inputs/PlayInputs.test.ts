import { describe, expect, test } from 'vitest';

import { InputComponent } from '../../components/index.ts';
import { Level } from '../../level/index.ts';

import { PlayInputs } from './PlayInputs.ts';

describe('PlayInputs', () => {
    test("reads the World's inputs and moves the state on each tick", () => {
        const inputs = new PlayInputs(Level.createNew());

        expect(inputs.state.input('jump').held).toBe(false);

        inputs.advance({ heldKeys: ['Space'], pressedKeys: ['Space'] });
        expect(inputs.state.input('jump')).toEqual({ pressed: true, released: false, held: true });

        inputs.advance({ heldKeys: [], pressedKeys: [] });
        expect(inputs.state.input('jump')).toEqual({ pressed: false, released: true, held: false });
    });

    test('lists each unknown input once, in the order first read', () => {
        const inputs = new PlayInputs(Level.createNew());

        inputs.state.input('fire');
        inputs.advance({ heldKeys: [], pressedKeys: [] });
        inputs.state.input('dash');
        inputs.state.input('fire');

        expect(inputs.unknownInputs).toEqual(['fire', 'dash']);
    });

    test('a World with no InputComponent has no inputs', () => {
        const level = Level.createNew();
        level.world.removeComponent(InputComponent);
        const inputs = new PlayInputs(level);

        expect(inputs.state.input('jump').held).toBe(false);
        expect(inputs.unknownInputs).toEqual(['jump']);
    });
});

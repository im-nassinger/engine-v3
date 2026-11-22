import { describe, expect, test } from 'vitest';

import { InputComponent } from './InputComponent.ts';

describe('InputComponent', () => {
    test('a new one has the five inputs with their keys, and its card is the 13th', () => {
        const inputs = new InputComponent();

        expect(inputs.get('inputs')).toEqual([
            { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
            { name: 'right', keys: ['KeyD', 'ArrowRight'] },
            { name: 'up', keys: ['KeyW', 'ArrowUp'] },
            { name: 'down', keys: ['KeyS', 'ArrowDown'] },
            { name: 'jump', keys: ['Space'] },
        ]);
        expect(InputComponent.schema.cardOrder).toBe(13);
        expect(InputComponent.schema.hasCard).toBe(true);
    });

    test('two inputs with one name are refused, and the inputs stay', () => {
        const inputs = new InputComponent({ inputs: [{ name: 'jump', keys: [] }] });

        const outcome = inputs.writeValue('inputs', [
            { name: 'jump', keys: [] },
            { name: 'Jump', keys: [] },
        ]);

        expect(outcome).toEqual({ ok: false, problem: { reason: 'repeatedName', name: 'jump' } });
        expect(inputs.get('inputs')).toEqual([{ name: 'jump', keys: [] }]);
    });

    test('a key a level can not use is refused', () => {
        const inputs = new InputComponent();

        const outcome = inputs.writeValue('inputs', [{ name: 'menu', keys: ['Tab'] }]);

        expect(outcome).toEqual({ ok: false, problem: { reason: 'unbindableKey', key: 'Tab' } });
    });

    test('it is not in the Add Component menu, and it does not change during play', () => {
        const [inputsField] = InputComponent.schema.fields;

        expect(InputComponent.schema.addableByHand).toBe(false);
        expect(inputsField?.changeableInPlay).toBe(false);
    });

    test('two new ones do not share their lists', () => {
        const first = new InputComponent();
        const second = new InputComponent();

        expect(first.get('inputs')).not.toBe(second.get('inputs'));
    });
});

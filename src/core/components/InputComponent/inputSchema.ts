import { InputFieldType, ListFieldType } from '../../fields/index.ts';
import type { Input } from '../../fields/index.ts';
import type { KeyCode } from '../../keys/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { InputValues } from './InputValues.ts';

// The five every new level starts with, so the builtin player works at once (requirement, owner 2026-11-13).
// Also what the World's "No inputs" note adds.
const FIVE_INPUTS: readonly Input[] = [
    { name: 'left', keys: ['KeyA', 'ArrowLeft'] as KeyCode[] },
    { name: 'right', keys: ['KeyD', 'ArrowRight'] as KeyCode[] },
    { name: 'up', keys: ['KeyW', 'ArrowUp'] as KeyCode[] },
    { name: 'down', keys: ['KeyS', 'ArrowDown'] as KeyCode[] },
    { name: 'jump', keys: ['Space'] as KeyCode[] },
];

export const inputSchema = new ComponentSchema<InputValues>({
    typeName: 'InputComponent',
    cardOrder: 13,
    hasCard: true,
    // The World's alone, made with a new level or added by the World's note, like the camera's own.
    addableByHand: false,
    fields: [
        {
            key: 'inputs',
            label: 'Inputs',
            type: new ListFieldType<Input>({ itemType: new InputFieldType(), itemName: (item) => item.name }),
            defaultValue: FIVE_INPUTS,
            description: 'Named sets of keys, such as jump on Space, that triggers and scripts read.',
            changeableInPlay: false,
        },
    ],
});

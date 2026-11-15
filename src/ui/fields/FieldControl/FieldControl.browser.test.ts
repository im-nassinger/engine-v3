import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { AnyFieldDefinition } from '../../../core/components/index.ts';
import { NumberFieldType, TextFieldType } from '../../../core/fields/index.ts';
import type { FieldType } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import { CommandRunner, createCommandRegistry } from '../../../editor/commands/index.ts';
import { MIXED } from '../../../editor/inspector/index.ts';
import type { FieldModel } from '../../../editor/inspector/index.ts';
import { EditorSession } from '../../../editor/session/index.ts';
import { ManualClock, ManualFrames, ManualTimer } from '../../../editor/time/testing/index.ts';
import { CommandsContext } from '../../commands/index.ts';
import type { EditorCommands } from '../../commands/index.ts';
import '../../theme.css';
import { FieldControl } from './FieldControl.tsx';

let container: HTMLElement;
let root: Root;

beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '240px';
    document.body.append(container);
    root = createRoot(container);
});

afterEach(() => {
    root.unmount();
    container.remove();
});

function definitionOf(label: string, type: FieldType<unknown>): AnyFieldDefinition {
    return {
        key: 'value',
        label,
        type,
        defaultValue: undefined,
        description: '',
        changeableInPlay: false,
    };
}

// The field alone, with every committed value kept in order.
function showField(definition: AnyFieldDefinition, value: unknown) {
    const session = new EditorSession({
        level: Level.createNew(),
        clock: new ManualClock(),
        timer: new ManualTimer(),
        frames: new ManualFrames(),
    });
    const commands: EditorCommands = {
        registry: createCommandRegistry(session),
        runner: new CommandRunner(session.status),
        platform: 'other',
    };

    const committed: unknown[] = [];
    const field: FieldModel = { kind: 'field', definition, value, isEnabled: true, isReadOnly: false };
    const control = createElement(FieldControl, { field, onCommit: (newValue) => committed.push(newValue) });
    root.render(createElement(CommandsContext, { value: commands }, control));

    return committed;
}

async function shownInput() {
    await expect.poll(() => container.querySelector('input')).not.toBeNull();
    const input = container.querySelector('input');
    if (input === null) throw new Error('No input is shown.');

    return input;
}

describe('FieldControl', () => {
    test('a fraction in a whole-number field is rounded', async () => {
        const type = new NumberFieldType({ min: 1, wholeNumber: true });
        const committed = showField(definitionOf('Count', type), 3);
        const box = await shownInput();

        await userEvent.click(box);
        await userEvent.fill(box, '4.6');
        await userEvent.keyboard('{Enter}');

        expect(committed).toEqual([5]);
    });

    test('a value below the minimum is clamped with its note', async () => {
        const type = new NumberFieldType({ min: 1, wholeNumber: true });
        const committed = showField(definitionOf('Count', type), 3);
        const box = await shownInput();

        await userEvent.click(box);
        await userEvent.fill(box, '-2');
        await userEvent.keyboard('{Enter}');

        expect(committed).toEqual([1]);
        await expect.poll(() => container.querySelector('.field-message')?.textContent).toBe('Min is 1');
    });

    test('a text field commits on Enter, and an unchanged text commits nothing', async () => {
        const committed = showField(definitionOf('Label', new TextFieldType()), 'Door');
        const box = await shownInput();

        await userEvent.click(box);
        await userEvent.keyboard('{Enter}');
        expect(committed).toEqual([]);

        await userEvent.click(box);
        await userEvent.fill(box, 'Gate');
        await userEvent.keyboard('{Enter}');
        expect(committed).toEqual(['Gate']);
    });

    test('a text field with different values shows Mixed', async () => {
        showField(definitionOf('Label', new TextFieldType()), MIXED);
        const box = await shownInput();

        expect(box.value).toBe('');
        expect(box.placeholder).toBe('Mixed');
    });
});

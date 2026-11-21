import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { AnyFieldDefinition } from '../../../../core/components/index.ts';
import type { FieldType } from '../../../../core/fields/index.ts';
import { Level } from '../../../../core/level/index.ts';
import { CommandRunner, createCommandRegistry } from '../../../../editor/commands/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import { EditorSession } from '../../../../editor/session/index.ts';
import { ManualClock, ManualFrames, ManualTimer } from '../../../../editor/time/testing/index.ts';
import { CommandsContext } from '../../../commands/index.ts';
import type { EditorCommands } from '../../../commands/index.ts';
import '../../../theme.css';
import { FieldControl } from '../FieldControl.tsx';
import type { FieldSubject } from '../../FieldProps.ts';

// For the fields' browser tests: one field shown alone in a 240 px column, with every committed value
// kept in order.

let container: HTMLElement | undefined;
let root: Root | undefined;

export function definitionOf(label: string, type: FieldType<unknown>): AnyFieldDefinition {
    return {
        key: 'value',
        label,
        type,
        defaultValue: undefined,
        description: '',
        changeableInPlay: false,
    };
}

export type ShownFieldOptions = {
    readonly isEnabled?: boolean;
};

export function showField(
    definition: AnyFieldDefinition,
    value: unknown,
    { isEnabled = true }: ShownFieldOptions = {},
) {
    closeField();
    container = document.createElement('div');
    container.style.width = '240px';
    document.body.append(container);
    root = createRoot(container);

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
    const field: FieldModel = { kind: 'field', definition, value, isEnabled, isReadOnly: false };
    const subject: FieldSubject = { openLevel: session.openLevel, typeName: 'TestComponent', entityIds: [] };
    const control = createElement(FieldControl, {
        field,
        subject,
        onCommit: (newValue) => committed.push(newValue),
        onCommitAxis: (axis, newValue) => committed.push({ [axis]: newValue }),
        onCommitEach: (valueFor) => committed.push(valueFor(value)),
    });
    root.render(createElement(CommandsContext, { value: commands }, control));

    return committed;
}

export function closeField() {
    root?.unmount();
    container?.remove();
    root = undefined;
    container = undefined;
}

export function fieldContainer() {
    if (container === undefined) throw new Error('No field is shown.');

    return container;
}

const LONGEST_WAIT_MS = 2000;

// The part once React has shown it, waiting a few frames at most.
export async function shownFieldPart<T extends Element = HTMLElement>(selector: string) {
    const startedAt = performance.now();
    while (performance.now() - startedAt < LONGEST_WAIT_MS) {
        const element = fieldContainer().querySelector<T>(selector);
        if (element !== null) return element;

        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    throw new Error(`Nothing matches ${selector}.`);
}

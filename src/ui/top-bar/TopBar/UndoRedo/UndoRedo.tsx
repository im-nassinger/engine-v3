import { Redo2, Undo2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { shortcutText, useCommands } from '../../../commands/index.ts';
import { useEditorSession } from '../../../EditorContext.tsx';
import { useVersion } from '../../../hooks/index.ts';
import { IconButton } from '../../../shared/index.ts';
import './UndoRedo.css';

const UNDO = 'edit.undo';
const REDO = 'edit.redo';

// Greyed when there is nothing to undo or redo. The tooltip names the step: "Undo: Delete Square".
export function UndoRedo() {
    const session = useEditorSession();
    useVersion(session.openLevelChanged);
    const history = session.openLevel.history;
    useVersion(history.version);

    return (
        <span className="undo-redo">
            <HistoryButton commandId={UNDO} icon={Undo2} stepLabel={history.undoLabel} />
            <HistoryButton commandId={REDO} icon={Redo2} stepLabel={history.redoLabel} />
        </span>
    );
}

type HistoryButtonProps = {
    commandId: string;
    icon: LucideIcon;
    stepLabel: string | undefined;
};

function HistoryButton({ commandId, icon, stepLabel }: HistoryButtonProps) {
    // availability() answers differently while the command object stays the same, so the React
    // Compiler must not keep an old answer.
    'use no memo';

    const { registry, runner, platform } = useCommands();
    const command = registry.find(commandId);
    if (command === undefined) throw new Error(`No command has the id ${commandId}.`);

    const availability = command.availability();
    const disabledReason = availability.enabled ? undefined : availability.reason;

    let label = command.label;
    if (stepLabel !== undefined) {
        label = `${command.label}: ${stepLabel}`;
    }

    const shortcut = shortcutText(command, platform);

    return (
        <IconButton
            icon={icon}
            label={label}
            shortcut={shortcut}
            disabledReason={disabledReason}
            onClick={() => runner.run(command)}
        />
    );
}

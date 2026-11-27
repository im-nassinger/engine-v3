import type { LucideIcon } from 'lucide-react';
import { shortcutText, useCommands } from '../../../commands/index.ts';
import { Icon, Tooltip } from '../../../shared/index.ts';
import './PlayBarButton.css';

export type PlayBarButtonSize = 'small' | 'big';

export type PlayBarButtonProps = {
    commandId: string;
    icon: LucideIcon;
    size?: PlayBarButtonSize;
};

// One of the Play bar's commands as a round icon. Its name, which follows the run, and its key show in the
// tooltip; a disabled one's tooltip says why instead. The big one is filled with the state's colour.
export function PlayBarButton({ commandId, icon, size = 'small' }: PlayBarButtonProps) {
    // availability() and the label answer differently while the command object stays the same, so the
    // React Compiler must not keep an old answer.
    'use no memo';

    const { registry, runner, platform } = useCommands();
    const command = registry.find(commandId);
    if (command === undefined) throw new Error(`No command has the id ${commandId}.`);

    const availability = command.availability();
    const isDisabled = !availability.enabled;
    const shortcut = shortcutText(command, platform);

    const handleClick = () => {
        if (isDisabled) return;

        runner.run(command);
    };

    let tooltipLabel = command.label;
    let tooltipShortcut = shortcut;
    if (!availability.enabled) {
        tooltipLabel = availability.reason;
        tooltipShortcut = undefined;
    }

    return (
        <Tooltip label={tooltipLabel} shortcut={tooltipShortcut}>
            <button
                type="button"
                className="play-bar-button"
                data-size={size}
                aria-label={command.label}
                aria-disabled={isDisabled}
                onClick={handleClick}
            >
                <Icon icon={icon} />
            </button>
        </Tooltip>
    );
}

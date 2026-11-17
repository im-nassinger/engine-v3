import type { LucideIcon } from 'lucide-react';
import { shortcutText, useCommands } from '../../../commands/index.ts';
import { Icon, Tooltip } from '../../../shared/index.ts';
import './PlayBarButton.css';

export type PlayBarButtonProps = {
    commandId: string;
    icon: LucideIcon;
};

// One of the Play bar's commands: its icon, its name, which follows the run, and its key in --muted. A
// disabled one says why in its tooltip.
export function PlayBarButton({ commandId, icon }: PlayBarButtonProps) {
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

    const button = (
        <button type="button" className="play-bar-button" aria-disabled={isDisabled} onClick={handleClick}>
            <Icon icon={icon} />
            <span className="name">{command.label}</span>
            {shortcut !== undefined && <span className="shortcut">{shortcut}</span>}
        </button>
    );
    if (availability.enabled) return button;

    return <Tooltip label={availability.reason}>{button}</Tooltip>;
}

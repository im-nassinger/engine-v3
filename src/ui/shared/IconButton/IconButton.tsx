import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon/index.ts';
import { Tooltip } from '../Tooltip/index.ts';
import './IconButton.css';

export type IconButtonProps = {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    shortcut?: string;
    isOn?: boolean;
    // A disabled button still says why, in its tooltip.
    disabledReason?: string;
};

export function IconButton({ icon, label, onClick, shortcut, isOn, disabledReason }: IconButtonProps) {
    const isDisabled = disabledReason !== undefined;

    let tooltipLabel = label;
    let tooltipShortcut = shortcut;
    if (isDisabled) {
        tooltipLabel = disabledReason;
        tooltipShortcut = undefined;
    }

    const handleClick = () => {
        if (isDisabled) return;

        onClick();
    };

    return (
        <Tooltip label={tooltipLabel} shortcut={tooltipShortcut}>
            <button
                type="button"
                className="icon-button"
                aria-label={label}
                aria-pressed={isOn}
                aria-disabled={isDisabled}
                onClick={handleClick}
            >
                <Icon icon={icon} />
            </button>
        </Tooltip>
    );
}

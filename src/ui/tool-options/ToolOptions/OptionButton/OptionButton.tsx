import type { LucideIcon } from 'lucide-react';
import { Icon, Tooltip } from '../../../shared/index.ts';
import './OptionButton.css';

export type OptionButtonProps = {
    icon: LucideIcon;
    label: string;
    // Shown on hover when the label alone doesn't say enough, such as a joint's physics name.
    tooltip?: string;
    isOn: boolean;
    onClick: () => void;
};

// One choice of the options strip: an icon with its name. The chosen one is on.
export function OptionButton({ icon, label, tooltip, isOn, onClick }: OptionButtonProps) {
    const button = (
        <button type="button" className="option-button" aria-pressed={isOn} onClick={onClick}>
            <Icon icon={icon} />
            {label}
        </button>
    );
    if (tooltip === undefined) return button;

    return <Tooltip label={tooltip}>{button}</Tooltip>;
}

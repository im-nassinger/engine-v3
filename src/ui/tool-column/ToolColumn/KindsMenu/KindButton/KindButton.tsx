import type { LucideIcon } from 'lucide-react';
import { Icon, Tooltip } from '../../../../shared/index.ts';
import './KindButton.css';

export type KindButtonProps = {
    icon: LucideIcon;
    label: string;
    // Shown on hover when the label alone doesn't say enough, such as a joint's physics name.
    tooltip?: string;
    isOn: boolean;
    onClick: () => void;
};

// One entry of a kinds menu: an icon with its name. The chosen one is drawn like the active tool.
export function KindButton({ icon, label, tooltip, isOn, onClick }: KindButtonProps) {
    const button = (
        <button type="button" className="kind-button" aria-pressed={isOn} onClick={onClick}>
            <Icon icon={icon} />
            {label}
        </button>
    );
    if (tooltip === undefined) return button;

    return <Tooltip label={tooltip}>{button}</Tooltip>;
}

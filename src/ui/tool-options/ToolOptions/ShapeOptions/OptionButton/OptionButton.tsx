import type { LucideIcon } from 'lucide-react';
import { Icon } from '../../../../shared/index.ts';
import './OptionButton.css';

export type OptionButtonProps = {
    icon: LucideIcon;
    label: string;
    isOn: boolean;
    onClick: () => void;
};

// One choice of the options strip: an icon with its name. The chosen one is on.
export function OptionButton({ icon, label, isOn, onClick }: OptionButtonProps) {
    return (
        <button type="button" className="option-button" aria-pressed={isOn} onClick={onClick}>
            <Icon icon={icon} />
            {label}
        </button>
    );
}

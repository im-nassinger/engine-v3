import { Check } from 'lucide-react';
import type { MenuAction } from '../../MenuEntry.ts';
import { Icon } from '../../../Icon/index.ts';
import { Tooltip } from '../../../Tooltip/index.ts';
import './MenuActionRow.css';

export type MenuActionRowProps = {
    action: MenuAction;
    onChoose: () => void;
    onPointerEnter: (() => void) | undefined;
};

export function MenuActionRow({ action, onChoose, onPointerEnter }: MenuActionRowProps) {
    const isDisabled = action.disabledReason !== undefined;

    const choose = () => {
        if (isDisabled) return;

        action.onChoose();
        onChoose();
    };

    const row = (
        <button
            type="button"
            className="menu-action-row"
            role="menuitem"
            data-described={action.description !== undefined}
            aria-disabled={isDisabled}
            aria-checked={action.checked}
            onClick={choose}
            onPointerEnter={onPointerEnter}
        >
            <span className="tick">{action.checked && <Icon icon={Check} size="small" />}</span>
            <MenuActionLabel label={action.label} description={action.description} />
            {action.shortcut && <span className="shortcut">{action.shortcut}</span>}
            {action.note !== undefined && <span className="note">{action.note}</span>}
        </button>
    );

    if (action.disabledReason === undefined) return row;

    return <Tooltip label={action.disabledReason}>{row}</Tooltip>;
}

type MenuActionLabelProps = {
    label: string;
    description: string | undefined;
};

function MenuActionLabel({ label, description }: MenuActionLabelProps) {
    if (description === undefined) return <span className="label">{label}</span>;

    return (
        <span className="label">
            <span>{label}</span>
            <span className="description">{description}</span>
        </span>
    );
}

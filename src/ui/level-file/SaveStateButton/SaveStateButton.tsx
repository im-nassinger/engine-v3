import { Check, Eye, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SaveIndicator } from '../../../editor/saving/index.ts';
import { useVersion } from '../../hooks/index.ts';
import { useSaveIndicator } from '../../save-state/index.ts';
import { Icon, MenuButton } from '../../shared/index.ts';
import { SaveExplanation } from './SaveExplanation/index.ts';
import './SaveStateButton.css';

// The save state in words, such as `Saved` or `Save failed`. Clicking it explains the state under it.
export function SaveStateButton() {
    const indicator = useSaveIndicator();
    useVersion(indicator.version);
    const shown = indicator.shown;
    const icon = iconOf(indicator);
    const menu = <SaveExplanation text={shown.explanation} />;

    return (
        <span className="save-state-button" data-status={indicator.state.status} data-mode={indicator.mode}>
            <MenuButton label={`Save state: ${shown.label}`} menu={menu}>
                {icon && <Icon icon={icon} size="small" />}
                {shown.label}
            </MenuButton>
        </span>
    );
}

// A tick when saved, a warning when it failed, an eye in a read-only tab; none while it is under way.
function iconOf(indicator: SaveIndicator): LucideIcon | undefined {
    if (indicator.mode === 'readOnly') return Eye;
    if (indicator.state.status === 'failed') return TriangleAlert;
    if (indicator.state.status === 'saved') return Check;

    return undefined;
}

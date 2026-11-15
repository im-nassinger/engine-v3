import type { MenuEntry, MenuSubmenu } from '../MenuEntry.ts';
import { MenuActionRow } from './MenuActionRow/index.ts';
import { MenuSubmenuRow } from './MenuSubmenuRow/index.ts';
import './MenuPanel.css';

export type MenuPanelProps = {
    entries: MenuEntry[];
    onChoose: () => void;
    openSubmenuId?: string;
    onShowSubmenu?: (submenu: MenuSubmenu, topPx: number) => void;
    onHideSubmenu?: () => void;
};

export function MenuPanel({ entries, onChoose, openSubmenuId, onShowSubmenu, onHideSubmenu }: MenuPanelProps) {
    return (
        <div className="menu-panel">
            {entries.map((entry) => (
                <MenuPanelEntry
                    key={entry.id}
                    entry={entry}
                    onChoose={onChoose}
                    isSubmenuOpen={entry.id === openSubmenuId}
                    onShowSubmenu={onShowSubmenu}
                    onHideSubmenu={onHideSubmenu}
                />
            ))}
        </div>
    );
}

type MenuPanelEntryProps = {
    entry: MenuEntry;
    onChoose: () => void;
    isSubmenuOpen: boolean;
    onShowSubmenu: ((submenu: MenuSubmenu, topPx: number) => void) | undefined;
    onHideSubmenu: (() => void) | undefined;
};

function MenuPanelEntry({ entry, onChoose, isSubmenuOpen, onShowSubmenu, onHideSubmenu }: MenuPanelEntryProps) {
    if (entry.kind === 'separator') return <div className="separator" role="separator" />;

    if (entry.kind === 'submenu') {
        return <MenuSubmenuRow submenu={entry} isOpen={isSubmenuOpen} onShow={onShowSubmenu} />;
    }

    return <MenuActionRow action={entry} onChoose={onChoose} onPointerEnter={onHideSubmenu} />;
}

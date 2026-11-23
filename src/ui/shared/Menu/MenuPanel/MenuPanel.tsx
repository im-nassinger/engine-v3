import type { ReactNode } from 'react';
import type { MenuEntry, MenuSubmenu } from '../MenuEntry.ts';
import { MenuActionRow } from './MenuActionRow/index.ts';
import { MenuSubmenuRow } from './MenuSubmenuRow/index.ts';
import './MenuPanel.css';

export type MenuPanelProps = {
    entries: MenuEntry[];
    onChoose: () => void;
    header?: ReactNode;
    openSubmenuId?: string;
    onShowSubmenu?: (submenu: MenuSubmenu, row: HTMLElement) => void;
    onHideSubmenu?: () => void;
    // Inside another popup, such as the entity picker: no panel of its own, only its entries.
    isPlain?: boolean;
};

export function MenuPanel(props: MenuPanelProps) {
    const { entries, onChoose, header, openSubmenuId, onShowSubmenu, onHideSubmenu, isPlain = false } = props;

    return (
        <div className="menu-panel" data-plain={isPlain}>
            {header}
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
    onShowSubmenu: ((submenu: MenuSubmenu, row: HTMLElement) => void) | undefined;
    onHideSubmenu: (() => void) | undefined;
};

function MenuPanelEntry({ entry, onChoose, isSubmenuOpen, onShowSubmenu, onHideSubmenu }: MenuPanelEntryProps) {
    if (entry.kind === 'separator') return <div className="separator" role="separator" />;
    if (entry.kind === 'heading') return <div className="heading">{entry.label}</div>;

    if (entry.kind === 'submenu') {
        return <MenuSubmenuRow submenu={entry} isOpen={isSubmenuOpen} onShow={onShowSubmenu} />;
    }

    return <MenuActionRow action={entry} onChoose={onChoose} onPointerEnter={onHideSubmenu} />;
}

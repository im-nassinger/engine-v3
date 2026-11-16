import { useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { MenuEntry, MenuSubmenu } from './MenuEntry.ts';
import { MenuPanel } from './MenuPanel/index.ts';
import { usePopupClosing } from '../popup-closing/index.ts';
import './Menu.css';

export type MenuAlign = 'start' | 'end';

// Above, for a button at the bottom of the window, such as the status bar's.
export type MenuSide = 'below' | 'above';

export type MenuProps = {
    entries: MenuEntry[];
    onClose: () => void;
    // The button that opened the menu. A press on it is left to the button, which closes the menu itself.
    anchor: RefObject<HTMLElement | null>;
    align?: MenuAlign;
    side?: MenuSide;
    // Shown above the entries, such as the zoom's box for a typed percentage.
    header?: ReactNode;
};

type OpenSubmenu = {
    submenu: MenuSubmenu;
    topPx: number;
};

// Placed under its anchor by the anchor's wrapper, which is positioned. Esc and a press outside close it.
export function Menu({ entries, onClose, anchor, align = 'start', side = 'below', header }: MenuProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [openSubmenu, setOpenSubmenu] = useState<OpenSubmenu | undefined>(undefined);
    usePopupClosing(rootRef, anchor, onClose);

    const showSubmenu = (submenu: MenuSubmenu, topPx: number) => setOpenSubmenu({ submenu, topPx });
    const hideSubmenu = () => setOpenSubmenu(undefined);

    const submenuStyle = { top: openSubmenu?.topPx };

    return (
        <div className="menu" data-align={align} data-side={side} ref={rootRef} role="menu">
            <MenuPanel
                entries={entries}
                header={header}
                openSubmenuId={openSubmenu?.submenu.id}
                onChoose={onClose}
                onShowSubmenu={showSubmenu}
                onHideSubmenu={hideSubmenu}
            />
            {openSubmenu && (
                <div className="submenu" style={submenuStyle}>
                    <MenuPanel entries={openSubmenu.submenu.entries} onChoose={onClose} />
                </div>
            )}
        </div>
    );
}

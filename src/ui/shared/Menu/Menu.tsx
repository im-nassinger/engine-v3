import { useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { MenuEntry, MenuSubmenu } from './MenuEntry.ts';
import { MenuPanel } from './MenuPanel/index.ts';
import { usePopupClosing } from '../popup-closing/index.ts';
import { rectOf, usePopupPlacement } from '../popup-placement/index.ts';
import type { PopupRect } from '../popup-placement/index.ts';
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
    row: HTMLElement;
};

const MENU_GAP_PX = 4;

// Opens on its side of its anchor, or the other side when only that one has room, and inside the window.
// Esc and a press outside close it.
export function Menu({ entries, onClose, anchor, align = 'start', side = 'below', header }: MenuProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [openSubmenu, setOpenSubmenu] = useState<OpenSubmenu | undefined>(undefined);
    usePopupClosing(rootRef, anchor, onClose);

    const readAnchor = () => rectOf(anchor);
    usePopupPlacement(rootRef, readAnchor, { side, align, gapPx: MENU_GAP_PX });

    const showSubmenu = (submenu: MenuSubmenu, row: HTMLElement) => setOpenSubmenu({ submenu, row });
    const hideSubmenu = () => setOpenSubmenu(undefined);

    return (
        <div className="menu" ref={rootRef} role="menu">
            <MenuPanel
                entries={entries}
                header={header}
                openSubmenuId={openSubmenu?.submenu.id}
                onChoose={onClose}
                onShowSubmenu={showSubmenu}
                onHideSubmenu={hideSubmenu}
            />
            {openSubmenu && (
                <Submenu key={openSubmenu.submenu.id} open={openSubmenu} menuAlign={align} onChoose={onClose} />
            )}
        </div>
    );
}

type SubmenuProps = {
    open: OpenSubmenu;
    menuAlign: MenuAlign;
    onChoose: () => void;
};

// Beside the menu's panel, level with its row: to the right, or the left for a menu aligned to its end.
function Submenu({ open, menuAlign, onChoose }: SubmenuProps) {
    const rootRef = useRef<HTMLDivElement>(null);

    const readAnchor = () => besideRow(open.row);
    usePopupPlacement(rootRef, readAnchor, { side: 'beside', align: menuAlign, gapPx: 0 });

    return (
        <div className="submenu" ref={rootRef}>
            <MenuPanel entries={open.submenu.entries} onChoose={onChoose} />
        </div>
    );
}

// The menu panel's left and right edges, and the row's top less the panel's inside space, so the
// submenu's first entry is level with the row.
function besideRow(row: HTMLElement): PopupRect | undefined {
    const panel = row.closest('.menu-panel');
    if (!panel) return undefined;

    const panelBox = panel.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    const insideSpace = parseFloat(getComputedStyle(panel).paddingTop);

    return { left: panelBox.left, right: panelBox.right, top: rowBox.top - insideSpace, bottom: rowBox.bottom };
}

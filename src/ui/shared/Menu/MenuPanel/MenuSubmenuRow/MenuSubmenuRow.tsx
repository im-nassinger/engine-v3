import { ChevronRight } from 'lucide-react';
import type { PointerEvent } from 'react';
import type { MenuSubmenu } from '../../MenuEntry.ts';
import { Icon } from '../../../Icon/index.ts';
import './MenuSubmenuRow.css';

export type MenuSubmenuRowProps = {
    submenu: MenuSubmenu;
    isOpen: boolean;
    onShow: ((submenu: MenuSubmenu, row: HTMLElement) => void) | undefined;
};

// The submenu opens to the right of its entry, level with it (docs/design/controls.md), or to its left
// or higher up when the window has no room there.
export function MenuSubmenuRow({ submenu, isOpen, onShow }: MenuSubmenuRowProps) {
    const show = (event: PointerEvent<HTMLButtonElement>) => {
        onShow?.(submenu, event.currentTarget);
    };

    return (
        <button
            type="button"
            className="menu-submenu-row"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onPointerEnter={show}
            onClick={show}
        >
            <span className="tick" />
            <span className="label">{submenu.label}</span>
            <Icon icon={ChevronRight} size="small" />
        </button>
    );
}

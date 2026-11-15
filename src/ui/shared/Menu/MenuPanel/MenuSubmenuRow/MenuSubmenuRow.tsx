import { ChevronRight } from 'lucide-react';
import type { PointerEvent } from 'react';
import type { MenuSubmenu } from '../../MenuEntry.ts';
import { Icon } from '../../../Icon/index.ts';
import './MenuSubmenuRow.css';

export type MenuSubmenuRowProps = {
    submenu: MenuSubmenu;
    isOpen: boolean;
    onShow: ((submenu: MenuSubmenu, topPx: number) => void) | undefined;
};

// The submenu opens to the right of its entry, level with it (docs/design/controls.md).
export function MenuSubmenuRow({ submenu, isOpen, onShow }: MenuSubmenuRowProps) {
    const show = (event: PointerEvent<HTMLButtonElement>) => {
        const rowTopPx = event.currentTarget.offsetTop;
        onShow?.(submenu, rowTopPx);
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

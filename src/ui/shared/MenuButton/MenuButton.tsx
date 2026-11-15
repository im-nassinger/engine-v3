import { ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../Icon/index.ts';
import { OpenMenuContext } from './OpenMenuContext.ts';
import './MenuButton.css';

export type MenuButtonProps = {
    label: string;
    // What the button shows: an icon, or a word with hasArrow.
    children: ReactNode;
    // Shown only while open. It reads useOpenMenu to close itself and to sit under the button.
    menu: ReactNode;
    hasArrow?: boolean;
    // 'field' fills its row like a field's box: a choice field's value. 'status' fits the status bar.
    look?: 'bar' | 'field' | 'status';
    isDisabled?: boolean;
};

// A button in a bar that opens a menu under itself, and closes it on a second press.
export function MenuButton({
    label,
    children,
    menu,
    hasArrow = false,
    look = 'bar',
    isDisabled = false,
}: MenuButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLSpanElement>(null);

    const toggle = () => setIsOpen((wasOpen) => !wasOpen);
    const close = () => setIsOpen(false);
    const openMenu = { close, anchor: anchorRef };

    return (
        <span className="menu-button" data-look={look} ref={anchorRef}>
            <button
                type="button"
                className="toggle"
                aria-label={label}
                aria-expanded={isOpen}
                disabled={isDisabled}
                onClick={toggle}
            >
                {children}
                {hasArrow && <MenuArrow />}
            </button>
            <OpenMenuContext value={openMenu}>{isOpen && menu}</OpenMenuContext>
        </span>
    );
}

function MenuArrow() {
    return (
        <span className="arrow">
            <Icon icon={ChevronDown} size="small" />
        </span>
    );
}

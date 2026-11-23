import { ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../Icon/index.ts';
import { Tooltip } from '../Tooltip/index.ts';
import { OpenMenuContext } from './OpenMenuContext.ts';
import './MenuButton.css';

export type MenuButtonProps = {
    label: string;
    // What the button shows: an icon, or a word with hasArrow.
    children: ReactNode;
    // Shown only while open. It reads useOpenMenu to close itself and to sit under the button.
    menu: ReactNode;
    hasArrow?: boolean;
    // 'field' fills its row like a field's box: a choice field's value.
    // 'island' fills its island with a tool-sized button in the middle, so a menu beside it lines up with
    // the island: ☰. 'quiet' draws its icon faint: a card's `…`.
    look?: 'bar' | 'field' | 'island' | 'quiet';
    isDisabled?: boolean;
};

// A button in a bar that opens a menu under itself, and closes it on a second press. Its label is its
// tooltip, except a field's, whose value already shows.
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

    const toggleButton = (
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
    );
    const hasTooltip = look !== 'field';

    return (
        <span className="menu-button" data-look={look} ref={anchorRef}>
            {hasTooltip && (
                <Tooltip label={label} isSuppressed={isOpen}>
                    {toggleButton}
                </Tooltip>
            )}
            {!hasTooltip && toggleButton}
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

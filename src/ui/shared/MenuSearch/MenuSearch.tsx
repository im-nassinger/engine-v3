import type { KeyboardEvent } from 'react';
import './MenuSearch.css';

export type MenuSearchProps = {
    label: string;
    search: string;
    onSearch: (search: string) => void;
    // Enter picks the first entry that can be picked.
    onEnter: () => void;
    // Shown under the box when nothing matches, such as "No component matches".
    noneText: string | undefined;
};

// The search box at the top of a searchable menu, as a Menu's header. It takes the keyboard when shown.
export function MenuSearch({ label, search, onSearch, onEnter, noneText }: MenuSearchProps) {
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        onEnter();
    };

    return (
        <div className="menu-search">
            <input
                className="search"
                aria-label={label}
                placeholder="Search"
                spellCheck={false}
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
            />
            {noneText !== undefined && <p className="none">{noneText}</p>}
        </div>
    );
}

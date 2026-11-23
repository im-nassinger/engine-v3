import { Crosshair } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { IconButton } from '../../../shared/index.ts';
import './EntityPickerSearch.css';

export type EntityPickerSearchProps = {
    search: string;
    onSearch: (search: string) => void;
    // Enter picks the first entity that can be picked.
    onEnter: () => void;
    onPickInLevel: () => void;
    // Shown under the box when nothing matches.
    noneText: string | undefined;
};

// The search box over the tree, which takes the keyboard when the picker opens, and the crosshair.
export function EntityPickerSearch({ search, onSearch, onEnter, onPickInLevel, noneText }: EntityPickerSearchProps) {
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        onEnter();
    };

    return (
        <div className="entity-picker-search">
            <div className="row">
                <input
                    className="search"
                    aria-label="Search entities"
                    placeholder="Search entities"
                    spellCheck={false}
                    value={search}
                    onChange={(event) => onSearch(event.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
                <IconButton icon={Crosshair} label="Pick in the level view" onClick={onPickInLevel} />
            </div>
            {noneText !== undefined && <p className="none">{noneText}</p>}
        </div>
    );
}

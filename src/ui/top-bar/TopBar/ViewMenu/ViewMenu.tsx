import { CommandMenu, viewMenuEntries } from '../../../commands/index.ts';
import { MenuButton } from '../../../shared/index.ts';

// The switches for what the editor draws over the level.
export function ViewMenu() {
    const menu = <CommandMenu entriesOf={viewMenuEntries} align="end" />;

    return (
        <MenuButton label="View menu" menu={menu} hasArrow>
            View
        </MenuButton>
    );
}

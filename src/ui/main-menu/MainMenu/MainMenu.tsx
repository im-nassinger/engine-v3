import { Menu as MenuIcon } from 'lucide-react';
import { CommandMenu, mainMenuEntries } from '../../commands/index.ts';
import { Icon, MenuButton } from '../../shared/index.ts';

// The full list of commands, one submenu per menu name, at the top bar's left end.
export function MainMenu() {
    const menu = <CommandMenu entriesOf={mainMenuEntries} />;

    return (
        <MenuButton label="Main menu" menu={menu}>
            <Icon icon={MenuIcon} />
        </MenuButton>
    );
}

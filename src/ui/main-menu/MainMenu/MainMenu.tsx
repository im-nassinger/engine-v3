import { Menu as MenuIcon } from 'lucide-react';
import { CommandMenu, mainMenuEntries } from '../../commands/index.ts';
import { Icon, MenuButton } from '../../shared/index.ts';

// ☰, alone in its island at the top left. The main menu, the full list of commands, opens to its right.
export function MainMenu() {
    const menu = <CommandMenu entriesOf={mainMenuEntries} side="beside" />;

    return (
        <MenuButton label="Main menu" menu={menu} look="island">
            <Icon icon={MenuIcon} />
        </MenuButton>
    );
}

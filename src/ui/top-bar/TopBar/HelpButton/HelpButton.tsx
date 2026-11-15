import { CircleHelp } from 'lucide-react';
import { CommandMenu, helpMenuEntries } from '../../../commands/index.ts';
import { Icon, MenuButton } from '../../../shared/index.ts';

// Opens the main menu's Help submenu, at the top bar's right end.
export function HelpButton() {
    const menu = <CommandMenu entriesOf={helpMenuEntries} align="end" />;

    return (
        <MenuButton label="Help" menu={menu}>
            <Icon icon={CircleHelp} />
        </MenuButton>
    );
}

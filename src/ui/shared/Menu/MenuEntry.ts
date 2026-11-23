export type MenuAction = {
    kind: 'action';
    id: string;
    label: string;
    onChoose: () => void;
    shortcut?: string;
    // A switch: shows a tick when true, nothing when false. Undefined for an entry that isn't a switch.
    checked?: boolean;
    // A disabled entry is greyed, and its tooltip says why.
    disabledReason?: string;
    // A small faint word at the right, such as a variable's type.
    note?: string;
};

// The title of the entries under it, in small caps: the variable menu's "The level's".
export type MenuHeading = {
    kind: 'heading';
    id: string;
    label: string;
};

export type MenuSeparator = {
    kind: 'separator';
    id: string;
};

// One level of submenus only: the main menu's File, Edit and the rest. A submenu holds no submenu.
export type MenuSubmenu = {
    kind: 'submenu';
    id: string;
    label: string;
    entries: MenuItem[];
};

export type MenuItem = MenuAction | MenuSeparator | MenuHeading;

export type MenuEntry = MenuItem | MenuSubmenu;

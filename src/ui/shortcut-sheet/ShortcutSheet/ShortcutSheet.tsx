import { Search, X } from 'lucide-react';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ShortcutCatalog, ShortcutMap, ShortcutSearch } from '../../../editor/shortcuts/index.ts';
import { shortcutText, useCommands } from '../../commands/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { Icon, IconButton } from '../../shared/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { ShortcutSheetSection } from './ShortcutSheetSection/index.ts';
import './ShortcutSheet.css';

const SHORTCUT_LIST_COMMAND = 'help.shortcuts';

// The shortcut list: a search field that has the focus when it opens, then every shortcut by area, the
// rows the search leaves. Typing in the field reaches no editor shortcut, since the keyboard is in a text
// field, and Esc there closes the sheet.
export function ShortcutSheet() {
    const session = useEditorSession();
    const { registry, platform } = useCommands();
    const { controller } = useEditorTools();
    const [query, setQuery] = useState('');

    const shortcuts = ShortcutMap.fromRegistry(registry);
    const toolIds = controller.tools.map((tool) => tool.id);
    const catalog = ShortcutCatalog.build({ shortcuts, registry, toolIds, platform });
    const search = new ShortcutSearch(query);
    const sections = search.filter(catalog.sections);

    const listCommand = registry.find(SHORTCUT_LIST_COMMAND);
    let closeShortcut: string | undefined;
    if (listCommand !== undefined) {
        closeShortcut = shortcutText(listCommand, platform);
    }

    const close = () => session.shortcutSheet.close();

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Escape') return;

        event.preventDefault();
        close();
    };

    return (
        <div className="shortcut-sheet">
            <div className="head">
                <label className="search">
                    <Icon icon={Search} size="small" />
                    <input
                        aria-label="Search shortcuts"
                        placeholder="Search shortcuts"
                        spellCheck={false}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                </label>
                <IconButton icon={X} label="Close" shortcut={closeShortcut} look="quiet" onClick={close} />
            </div>
            <div className="list">
                {sections.map((section) => (
                    <ShortcutSheetSection key={section.area} section={section} />
                ))}
                {sections.length === 0 && <p className="none">No shortcut matches</p>}
            </div>
        </div>
    );
}

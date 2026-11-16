import { Magnet } from 'lucide-react';
import { shortcutText, useCommands } from '../../../commands/index.ts';
import { useEditorSession } from '../../../EditorContext.tsx';
import { useReading } from '../../../hooks/index.ts';
import { IconButton } from '../../../shared/index.ts';

const GRID_SNAPPING = 'view.gridSnapping';

// The grid snapping switch, the same command as the View menu's Grid snapping and Shift+G.
export function GridSnapping() {
    const session = useEditorSession();
    const { registry, runner, platform } = useCommands();
    const command = registry.find(GRID_SNAPPING);
    if (command === undefined) throw new Error(`No command has the id ${GRID_SNAPPING}.`);

    const readIsOn = () => session.viewSettings.isOn('gridSnapping');
    const isOn = useReading(session.viewSettings.version, readIsOn);
    const shortcut = shortcutText(command, platform);

    return (
        <IconButton
            icon={Magnet}
            label={command.label}
            shortcut={shortcut}
            isOn={isOn}
            onClick={() => runner.run(command)}
        />
    );
}

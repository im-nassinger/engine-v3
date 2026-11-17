import { shortcutText, useCommands } from '../../../commands/index.ts';
import { Button, Tooltip } from '../../../shared/index.ts';

const PLAY_OR_STOP = 'play.playOrStop';

// The top bar's one primary button, in its middle. The top bar is hidden during play, so it always says Play.
export function PlayButton() {
    const { registry, runner, platform } = useCommands();
    const command = registry.find(PLAY_OR_STOP);
    if (command === undefined) throw new Error(`No command has the id ${PLAY_OR_STOP}.`);

    const shortcut = shortcutText(command, platform);

    return (
        <Tooltip label="Play" shortcut={shortcut}>
            <Button label="Play" variant="primary" onClick={() => runner.run(command)} />
        </Tooltip>
    );
}

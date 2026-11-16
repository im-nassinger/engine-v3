import { useCommands } from '../../commands/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { useReading, useVersion } from '../../hooks/index.ts';
import { Button } from '../../shared/index.ts';
import './BackToLevel.css';

const FIT_WHOLE_LEVEL = 'view.fitWholeLevel';

// Shown while the view holds nothing of the level: no part of the World's rectangle or of any entity.
// It fits the whole level, as the View menu's Whole level does.
export function BackToLevel() {
    const session = useEditorSession();
    const { registry, runner } = useCommands();
    useVersion(session.openLevelChanged);
    const openLevel = session.openLevel;

    const readHoldsNothing = () => {
        const contents = openLevel.caches.bounds.subtreeBoundsOf(openLevel.level.world);

        return session.view.holdsNothing(contents);
    };

    // Each reading redraws only when the answer changes, so panning redraws nothing until it does.
    useReading(openLevel.level.signals.levelVersion, readHoldsNothing);
    const holdsNothing = useReading(session.view.version, readHoldsNothing);
    if (!holdsNothing) return null;

    const goBack = () => {
        const command = registry.find(FIT_WHOLE_LEVEL);
        if (command === undefined) throw new Error(`No command has the id ${FIT_WHOLE_LEVEL}.`);

        runner.run(command);
    };

    return (
        <div className="back-to-level">
            <Button label="Back to level" variant="primary" onClick={goBack} />
        </div>
    );
}

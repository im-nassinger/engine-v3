import { useEditorSession } from '../../EditorContext.tsx';
import { useVersion } from '../../hooks/index.ts';
import { EntitiesList } from './EntitiesList/index.ts';
import './EntitiesViewer.css';

// The level's tree, one row per visible entity. New and Import give it a fresh list.
export function EntitiesViewer() {
    const session = useEditorSession();
    useVersion(session.openLevelChanged);
    const openLevel = session.openLevel;

    return (
        <div className="entities-viewer">
            <h2 className="head">Entities</h2>
            <EntitiesList openLevel={openLevel} />
        </div>
    );
}

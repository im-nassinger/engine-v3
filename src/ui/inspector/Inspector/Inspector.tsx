import { useEditorSession } from '../../EditorContext.tsx';
import { useVersion } from '../../hooks/index.ts';
import { AddComponent } from './AddComponent/index.ts';
import { InspectorCard } from './InspectorCard/index.ts';
import { InspectorHead } from './InspectorHead/index.ts';
import './Inspector.css';

// The selected entities' components as cards, or the World's when nothing is selected. Everything shown
// comes from the open level's InspectorModel, which moves its version only when what it shows changes.
export function Inspector() {
    // The model's getters give new answers while the model object stays the same, so the React Compiler
    // must not keep an old answer.
    'use no memo';

    const session = useEditorSession();
    useVersion(session.openLevelChanged);
    const openLevel = session.openLevel;
    const inspector = openLevel.inspector;
    useVersion(inspector.version);

    const entityIds = inspector.shownEntities.map((entity) => entity.id);

    return (
        <div className="inspector">
            <InspectorHead openLevel={openLevel} header={inspector.header} />
            <div className="cards">
                {inspector.cards.map((card) => (
                    <InspectorCard key={card.typeName} openLevel={openLevel} card={card} entityIds={entityIds} />
                ))}
                <AddComponent openLevel={openLevel} entries={inspector.addableComponents} entityIds={entityIds} />
            </div>
        </div>
    );
}

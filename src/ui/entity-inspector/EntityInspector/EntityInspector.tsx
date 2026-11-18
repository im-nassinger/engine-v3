import { useEditorSession } from '../../EditorContext.tsx';
import { useVersion } from '../../hooks/index.ts';
import { AddComponent } from './AddComponent/index.ts';
import { EntityInspectorCard } from './EntityInspectorCard/index.ts';
import { EntityInspectorHead } from './EntityInspectorHead/index.ts';
import './EntityInspector.css';

// The selected entities' components as cards, or the World's when nothing is selected. Everything shown
// comes from the open level's EntityInspectorModel, which moves its version only when what it shows changes.
export function EntityInspector() {
    // The model's getters give new answers while the model object stays the same, so the React Compiler
    // must not keep an old answer.
    'use no memo';

    const session = useEditorSession();
    useVersion(session.openLevelChanged);
    const openLevel = session.openLevel;
    const entityInspector = openLevel.entityInspector;
    useVersion(entityInspector.version);

    const entityIds = entityInspector.shownEntities.map((entity) => entity.id);

    return (
        <div className="entity-inspector">
            <EntityInspectorHead openLevel={openLevel} header={entityInspector.header} />
            <div className="cards">
                {entityInspector.cards.map((card) => (
                    <EntityInspectorCard key={card.typeName} openLevel={openLevel} card={card} entityIds={entityIds} />
                ))}
                <AddComponent openLevel={openLevel} entries={entityInspector.addableComponents} entityIds={entityIds} />
            </div>
        </div>
    );
}

import { Eye, EyeOff } from 'lucide-react';
import { toggleEntityHidden } from '../../../../editor/commands/index.ts';
import { rowKind } from '../../../../editor/entities-viewer/index.ts';
import { MIXED } from '../../../../editor/entity-inspector/index.ts';
import type { EntityInspectorHeader } from '../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../editor/session/index.ts';
import { useCommands } from '../../../commands/index.ts';
import { useEditorSession } from '../../../EditorContext.tsx';
import { IconButton, RowKindIcon } from '../../../shared/index.ts';
import { HeadNameBox } from './HeadNameBox/index.ts';
import './EntityInspectorHead.css';

const HIDE_OR_SHOW = 'edit.hideOrShow';

export type EntityInspectorHeadProps = {
    openLevel: OpenLevel;
    header: EntityInspectorHeader;
};

// The kind icon, the name in its box, and the eye. The World's name is plain text and it has no eye; with
// several entities the title reads `3 entities` and the eye hides or shows them all, like Hide or show.
export function EntityInspectorHead({ openLevel, header }: EntityInspectorHeadProps) {
    const session = useEditorSession();
    const { registry, runner } = useCommands();
    const { level } = openLevel;
    const onlyEntity = header.entity;
    const isWorld = onlyEntity === level.world;

    const toggleHidden = () => {
        if (onlyEntity === undefined) {
            const command = registry.find(HIDE_OR_SHOW);
            if (command === undefined) throw new Error(`No command has the id ${HIDE_OR_SHOW}.`);

            runner.run(command);
            return;
        }

        const outcome = toggleEntityHidden(openLevel, onlyEntity.id);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    // With some hidden and some shown, the eye hides them all, as Hide or show does.
    const isHidden = header.isHidden === true;
    const isMixed = header.isHidden === MIXED;
    const eyeIcon = isHidden ? EyeOff : Eye;
    let eyeLabel = isHidden ? 'Show' : 'Hide';
    if (isMixed) {
        eyeLabel = 'Hide all';
    }

    let kindIcon;
    let title = <span className="title">{header.title}</span>;
    if (onlyEntity !== undefined) {
        const kind = rowKind(onlyEntity, level);
        kindIcon = <RowKindIcon kind={kind} isSelected />;

        // Keyed by the name, so a rename made elsewhere, or undone, gives the box its new text.
        const nameKey = `${onlyEntity.id}:${header.title}`;
        if (header.canRename.enabled) {
            title = <HeadNameBox key={nameKey} openLevel={openLevel} entityId={onlyEntity.id} name={header.title} />;
        }
    }

    return (
        <div className="entity-inspector-head">
            {kindIcon}
            {title}
            {!isWorld && <IconButton icon={eyeIcon} label={eyeLabel} isOn={isHidden} onClick={toggleHidden} />}
        </div>
    );
}

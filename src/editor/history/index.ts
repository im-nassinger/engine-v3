export {
    AddComponentChange,
    AddEntitiesChange,
    MoveEntityChange,
    RemoveComponentChange,
    RemoveEntitiesChange,
    RenameLevelChange,
    SetGridSizeChange,
    SetSwitchChange,
    SetValueChange,
} from './changes/index.ts';
export type {
    ComponentChangeOptions,
    LevelChange,
    MoveEntityChangeOptions,
    SetValueChangeOptions,
    SubtreeCopyOptions,
    TreePlace,
} from './changes/index.ts';
export type { EditOutcome, SkippedEntity } from './EditOutcome.ts';
export { EditTransaction } from './EditTransaction.ts';
export { History } from './History.ts';
export type { HistoryStep, NewHistoryStep } from './HistoryStep.ts';
export { LevelEditor } from './LevelEditor.ts';
export { LiveEdit } from './LiveEdit.ts';
export { READ_ONLY_REASON, ReadOnlyMode } from './ReadOnlyMode.ts';
export type { ValueTarget } from './LiveEdit.ts';
export type { EditedGroup, EditedSelection, LevelEditorOptions } from './LevelEditor.ts';

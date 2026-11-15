export {
    AddEntitiesChange,
    MoveEntityChange,
    RemoveEntitiesChange,
    RenameLevelChange,
    SetSwitchChange,
    SetValueChange,
} from './changes/index.ts';
export type {
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
export type { EditedGroup, EditedSelection, LevelEditorOptions } from './LevelEditor.ts';

export { GoIntoGroupCommand } from './arrange/GoIntoGroupCommand.ts';
export { GroupCommand } from './arrange/GroupCommand.ts';
export { UngroupCommand } from './arrange/UngroupCommand.ts';
export {
    ClipboardEvents,
    CopyCommand,
    CutCommand,
    DuplicateCommand,
    PasteCommand,
    pasteEntities,
    pasteRefusalText,
} from './clipboard/index.ts';
export type { ClipboardParts, MouseOverView, PasteSpot, PasteTools } from './clipboard/index.ts';
export { CommandRegistry } from './CommandRegistry.ts';
export { createCommandRegistry } from './createCommandRegistry.ts';
export { createShape } from './draw/createShape.ts';
export type { CreateShapeOutcome, ShapeDrawing } from './draw/createShape.ts';
export { createTrigger } from './draw/createTrigger.ts';
export type { CreateTriggerOutcome } from './draw/createTrigger.ts';
export { createPath } from './draw/createPath.ts';
export type { CreatePathOutcome } from './draw/createPath.ts';
export { extendPath, extendRefusal } from './draw/extendPath.ts';
export type { ExtendPathOutcome, ExtendPathRefusal } from './draw/extendPath.ts';
export { DeleteCommand } from './edit/DeleteCommand.ts';
export {
    DAMAGED_FILE_NAME,
    DAMAGED_TITLE,
    damagedLevelQuestion,
    EXPORT_FAILED_TEXT,
    EXPORT_RAW_LABEL,
    ExportCommand,
    exportedText,
    FileDropEvents,
    IMPORT_REFUSED_TITLE,
    ImportCommand,
    importedText,
    importingText,
    LevelReplacement,
    NEW_LEVEL_TEXT,
    NewCommand,
    REPLACE_LABEL,
    REPLACE_QUESTION_TEXT,
    SAVED_TEXT,
    SaveCommand,
} from './file/index.ts';
export type { FileParts, LateOutcomes } from './file/index.ts';
export { AboutCommand, GAME_NAME } from './help/AboutCommand.ts';
export { editTriggers } from './triggers/editTriggers.ts';
export { toggleEntityHidden } from './hide/toggleEntityHidden.ts';
export { HideOrShowCommand } from './edit/HideOrShowCommand.ts';
export { RedoCommand } from './edit/RedoCommand.ts';
export { SelectAllCommand } from './edit/SelectAllCommand.ts';
export { UndoCommand } from './edit/UndoCommand.ts';
export type {
    Availability,
    CommandId,
    CommandOutcome,
    EditorCommand,
    MenuCommand,
    MenuName,
    MenuPlace,
    Notice,
    Question,
    ShortcutScope,
    TextRequest,
} from './EditorCommand.ts';
export { CommandRunner } from './running/CommandRunner.ts';
export type { CommandRunnerParts, PlayGate } from './running/CommandRunner.ts';
export {
    NOT_PAUSED_REASON,
    NOT_PLAYING_REASON,
    PauseOrResumeCommand,
    PlayOrStopCommand,
    StepCommand,
} from './play/index.ts';
export { OpenDialog } from './running/OpenDialog.ts';
export type { Dialog } from './running/OpenDialog.ts';
export { moveEntities } from './move/moveEntities.ts';
export type { MoveOutcome } from './move/moveEntities.ts';
export { EntityRotate } from './move/EntityRotate.ts';
export { geometryBox, ownBox } from './move/ownBox.ts';
export { SelectionMove } from './move/SelectionMove.ts';
export { nudgeSelection } from './move/nudgeSelection.ts';
export { JointEndMove } from './joints/JointEndMove.ts';
export type { JointEndSide } from './joints/JointEndMove.ts';
export { placeJoint } from './joints/placeJoint.ts';
export type { JointPlacement, PlaceJointOutcome } from './joints/placeJoint.ts';
export { addPoint } from './points/addPoint.ts';
export type { AddPointOutcome } from './points/addPoint.ts';
export { deletePoints } from './points/deletePoints.ts';
export { editablePointsOf, isJointPath } from './points/editablePoints.ts';
export type { EditablePoints, PointsKind } from './points/editablePoints.ts';
export { nudgePoints } from './points/nudgePoints.ts';
export { HandleMove } from './points/HandleMove.ts';
export type { HandleMoveOptions, HandleSide } from './points/HandleMove.ts';
export { PointsMove } from './points/PointsMove.ts';
export { setCorner } from './points/setCorner.ts';
export { RenameCommand } from './rename/RenameCommand.ts';
export { RENAME_LEVEL_TEXT, RenameLevelCommand } from './rename/RenameLevelCommand.ts';
export { renameEntity } from './rename/renameEntity.ts';
export { renameLevel } from './rename/renameLevel.ts';
export { GRID_SIZE_NOT_A_NUMBER, setGridSize } from './grid/setGridSize.ts';
export { EntityNamer } from './shared/EntityNamer.ts';
export { FitCameraFrameCommand } from './view/FitCameraFrameCommand.ts';
export { FitSelectionCommand } from './view/FitSelectionCommand.ts';
export { FitWholeLevelCommand } from './view/FitWholeLevelCommand.ts';
export { ViewSwitchCommand } from './view/ViewSwitchCommand.ts';
export type { ViewSwitchEntry } from './view/ViewSwitchCommand.ts';
export { ZoomInCommand } from './view/ZoomInCommand.ts';
export { ZoomOutCommand } from './view/ZoomOutCommand.ts';
export { ZoomToActualSizeCommand } from './view/ZoomToActualSizeCommand.ts';
export { addComponent } from './entity-inspector/addComponent.ts';
export { applyMessageFix } from './entity-inspector/applyMessageFix.ts';
export { FieldSlide } from './entity-inspector/FieldSlide.ts';
export type { SlideOutcome, SlidField } from './entity-inspector/FieldSlide.ts';
export { removeComponent } from './entity-inspector/removeComponent.ts';
export { resetComponent } from './entity-inspector/resetComponent.ts';
export { setBodyMass } from './entity-inspector/setBodyMass.ts';
export { setFieldValue, setFieldValueEach, setVectorAxis } from './entity-inspector/setFieldValue.ts';
export type { Axis } from './entity-inspector/setFieldValue.ts';
export { FillPlacement } from './fill/FillPlacement.ts';
export { moveGradientHandle } from './fill/moveGradientHandle.ts';
export type { GradientHandleRole } from './fill/moveGradientHandle.ts';

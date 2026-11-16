export {
    Autosave,
    DATA_CLEARED_TEXT,
    OVER_SIZE_TEXT,
    SAVE_FAILED_TEXT,
    SAVING_MESSAGE_SOURCE,
} from './autosave/Autosave.ts';
export type { AutosaveOptions, PersistAskedRecord } from './autosave/Autosave.ts';
export { SaveState } from './autosave/SaveState.ts';
export type { SaveStatus } from './autosave/SaveState.ts';
export type { LevelStore, SavedLevel, SaveWrite } from './contracts/LevelStore.ts';
export type { SettingsStore } from './contracts/SettingsStore.ts';
export type { StoragePersistence } from './contracts/StoragePersistence.ts';
export { PersistAskedSetting } from './settings/PersistAskedSetting.ts';
export type { TabGuard } from './contracts/TabGuard.ts';

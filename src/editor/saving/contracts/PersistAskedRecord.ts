// Whether the browser was already asked to keep the saved level, in this session or an earlier one.
// EditorSettings keeps it as `persistAsked`.
export type PersistAskedRecord = {
    readonly isAsked: boolean;
    markAsked(): void;
};

// Whether an editing session is open, kept between sessions: set when the editor opens and cleared when the page
// goes away. Found still set on opening, it means the last session ended in a crash. EditorSettings keeps it as
// `sessionOpen`.
export type SessionOpenRecord = {
    readonly isOpen: boolean;
    setOpen(open: boolean): void;
};

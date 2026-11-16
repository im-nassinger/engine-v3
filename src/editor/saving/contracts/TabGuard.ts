// Makes sure one tab at a time edits the level: a Web Lock in the page, held for the page's life.
// Resolves false when another tab holds it, and this tab is then read-only.
export type TabGuard = {
    acquire(): Promise<boolean>;
};

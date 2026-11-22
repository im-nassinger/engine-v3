// free: no other tab had the level. takenOver: another tab had it and handed it over, or was too slow to.
export type Acquired = 'free' | 'takenOver';

// What a tab does when a newer tab takes the level: save what it has, then refuse every edit.
export type HandOver = () => Promise<void>;

// Makes sure one tab at a time edits the level, the newest: a tab opening the editor takes the level from
// the tab that has it, which saves first and becomes read-only.
export type TabGuard = {
    acquire(): Promise<Acquired>;
    // Run once, when a newer tab takes the level. Run at once if that happened before it was given.
    whenTakenOver(handOver: HandOver): void;
};

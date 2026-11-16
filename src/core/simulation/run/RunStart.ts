// What a run starts from besides the level. Nothing in a run reads the real time; the seed comes with v2.
export type RunStart = {
    readonly clockTimeMs: number;
};

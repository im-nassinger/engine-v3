// The numbers the reader and the editor hold a level to. A test can pass smaller ones.
export type LevelLimits = {
    readonly maxEntities: number;
    // Counted in parents above an entity: an entity directly inside the World is 1 deep.
    readonly maxDepth: number;
    // Per polygon or line.
    readonly maxShapePoints: number;
    readonly maxPathPoints: number;
    // Counted unpacked, checked where the bytes exist: the import worker and the save.
    readonly maxBytes: number;
    // The World's rectangle, each side, in px. Centred on the origin, so its edge is at most half of it out.
    readonly maxLevelSize: number;
};

export const V1_LEVEL_LIMITS: LevelLimits = {
    maxEntities: 100_000,
    maxDepth: 256,
    maxShapePoints: 1_000,
    maxPathPoints: 2_000,
    maxBytes: 256 * 1024 * 1024,
    maxLevelSize: 200_000,
};

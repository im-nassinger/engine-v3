// A cubic ease in and out (design/controls.md: every move eases in and out, owner): 0 → 0, 1 → 1, slow at
// both ends.
export function easeInOut(progress: number) {
    if (progress < 0.5) return 4 * progress ** 3;

    const fromEnd = 2 - 2 * progress;
    return 1 - fromEnd ** 3 / 2;
}

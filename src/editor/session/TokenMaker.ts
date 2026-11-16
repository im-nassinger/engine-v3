// Makes a text no earlier call gave, for naming one opening of a level.
export type TokenMaker = () => string;

// 'opening-1', 'opening-2' and on: known in advance, so a test can name the token it expects.
export function countingTokens(): TokenMaker {
    let count = 0;

    return () => {
        count += 1;
        return `opening-${count}`;
    };
}

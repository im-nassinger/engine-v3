import { PROJECT_FILE_EXTENSION } from './ProjectFile.ts';

const FALLBACK_NAME = 'level';
// The characters Windows refuses in a file name, which covers macOS and Linux too, and control characters.
// eslint-disable-next-line no-control-regex
const NOT_ALLOWED = /[\\/:*?"<>|\u0000-\u001f\u007f]/gu;
const SPACES_AND_DOTS_AT_ENDS = /^[\s.]+|[\s.]+$/gu;

// The export's file name from the level's name: each character no file system allows becomes _, spaces
// and dots at both ends are trimmed, and nothing left gives `level`. `A/B: C?` gives `A_B_ C_.editable`.
export function projectFileName(levelName: string) {
    const replaced = levelName.replace(NOT_ALLOWED, '_');
    const trimmed = replaced.replace(SPACES_AND_DOTS_AT_ENDS, '');
    const base = trimmed === '' ? FALLBACK_NAME : trimmed;

    return `${base}${PROJECT_FILE_EXTENSION}`;
}

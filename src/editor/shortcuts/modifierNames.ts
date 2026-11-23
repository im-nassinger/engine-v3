import type { KeyboardPlatform } from './KeyboardInputData.ts';

// On a Mac, Ctrl is Cmd and Alt is Option, as the requirement says.
export function ctrlName(platform: KeyboardPlatform) {
    return platform === 'mac' ? 'Cmd' : 'Ctrl';
}

export function altName(platform: KeyboardPlatform) {
    return platform === 'mac' ? 'Option' : 'Alt';
}

import type { KeyboardPlatform } from '../../../editor/shortcuts/index.ts';

// navigator.platform is deprecated but still the one value every browser fills in; an iPad with a
// keyboard reports MacIntel, which is what it should count as.
export function keyboardPlatform(navigatorPlatform: string): KeyboardPlatform {
    const isApple = /^(Mac|iPhone|iPad|iPod)/.test(navigatorPlatform);
    if (isApple) return 'mac';

    return 'other';
}

import type { LucideIcon } from 'lucide-react';
import './Icon.css';

// docs/design/controls.md: 24 px drawings shown at 16 px (13 px in the status bar and in fields), a 1.6 px stroke.
const NORMAL_SIZE = 16;
const SMALL_SIZE = 13;
const STROKE_WIDTH = 1.6;

export type IconSize = 'normal' | 'small';

export type IconProps = {
    icon: LucideIcon;
    size?: IconSize;
};

export function Icon({ icon: LucideDrawing, size = 'normal' }: IconProps) {
    const pixelSize = size === 'small' ? SMALL_SIZE : NORMAL_SIZE;

    return <LucideDrawing className="icon" size={pixelSize} strokeWidth={STROKE_WIDTH} aria-hidden="true" />;
}

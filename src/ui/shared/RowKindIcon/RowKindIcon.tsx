import {
    Box,
    Cable,
    Circle,
    CircleDot,
    Folder,
    Globe,
    Pentagon,
    Slash,
    Spline,
    Square,
    Video,
    Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RowKind } from '../../../editor/entities-panel/index.ts';
import { Icon } from '../Icon/index.ts';
import './RowKindIcon.css';

const ICON_BY_KIND: Record<RowKind, LucideIcon> = {
    world: Globe,
    camera: Video,
    'hinge-joint': CircleDot,
    'rope-joint': Cable,
    'spring-joint': Waves,
    rectangle: Square,
    circle: Circle,
    polygon: Pentagon,
    line: Slash,
    path: Spline,
    group: Folder,
    entity: Box,
};

export type RowKindIconProps = {
    kind: RowKind;
    isSelected: boolean;
};

export function RowKindIcon({ kind, isSelected }: RowKindIconProps) {
    const icon = ICON_BY_KIND[kind];

    return (
        <span className="row-kind-icon" data-kind={kind} data-selected={isSelected}>
            <Icon icon={icon} />
        </span>
    );
}

import { ReactElement } from 'react';
import { Skeleton } from 'primereact/skeleton';

type SkeletonRow = { isSkeleton?: boolean };

const DEFAULT_SKELETON_HEIGHT = '0.85rem';

export const skeletonCell = (width: string, height: string = DEFAULT_SKELETON_HEIGHT): ReactElement => (
    <Skeleton width={width} height={height} />
);

export const buildSkeletonRows = <T extends SkeletonRow>(count: number, makeRow: (index: number) => T): T[] =>
    Array.from({ length: count }, (_, idx) => makeRow(idx));

export const isSkeletonRow = (row: SkeletonRow | null | undefined): boolean => Boolean(row?.isSkeleton);

export type DrySaveDiffEntry = {
    path: string;
    before: unknown;
    after: unknown;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
    if (value == null || typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    return Object.prototype.toString.call(value) === '[object Object]';
};

const joinObjectPath = (basePath: string, key: string) => (basePath ? `${basePath}.${key}` : key);

const joinArrayPath = (basePath: string, index: number) => (basePath ? `${basePath}[${index}]` : `[${index}]`);

const collectDiffEntriesInternal = (
    beforeValue: unknown,
    afterValue: unknown,
    path: string,
    entries: DrySaveDiffEntry[]
) => {
    if (Object.is(beforeValue, afterValue)) return;

    if (Array.isArray(beforeValue) && Array.isArray(afterValue)) {
        const maxLength = Math.max(beforeValue.length, afterValue.length);
        for (let index = 0; index < maxLength; index += 1) {
            collectDiffEntriesInternal(
                beforeValue[index],
                afterValue[index],
                joinArrayPath(path, index),
                entries
            );
        }
        return;
    }

    if (isPlainRecord(beforeValue) && isPlainRecord(afterValue)) {
        const keys = Array.from(new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)])).sort();
        keys.forEach((key) => {
            collectDiffEntriesInternal(
                beforeValue[key],
                afterValue[key],
                joinObjectPath(path, key),
                entries
            );
        });
        return;
    }

    entries.push({
        path: path || '(root)',
        before: beforeValue,
        after: afterValue
    });
};

export const collectDeepDiffEntries = (beforeValue: unknown, afterValue: unknown): DrySaveDiffEntry[] => {
    const entries: DrySaveDiffEntry[] = [];
    collectDiffEntriesInternal(beforeValue, afterValue, '', entries);
    return entries;
};

export const formatDryDiffValue = (value: unknown, maxLength = 120): string => {
    let rendered: string;
    if (typeof value === 'string') {
        rendered = `"${value}"`;
    } else if (value === undefined) {
        rendered = 'undefined';
    } else if (value === null) {
        rendered = 'null';
    } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        rendered = String(value);
    } else {
        try {
            rendered = JSON.stringify(value);
        } catch {
            rendered = String(value);
        }
    }
    if (rendered.length <= maxLength) return rendered;
    return `${rendered.slice(0, Math.max(0, maxLength - 3))}...`;
};

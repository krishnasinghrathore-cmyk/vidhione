import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../../../..');

const loadTsModule = (relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const sourceText = fs.readFileSync(absolutePath, 'utf8');
    const transpiled = ts.transpileModule(sourceText, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020
        }
    });
    const module = { exports: {} };
    const context = vm.createContext({
        module,
        exports: module.exports,
        globalThis
    });
    const script = new vm.Script(transpiled.outputText, { filename: absolutePath });
    script.runInContext(context);
    return module.exports;
};

const drySaveDiffModule = loadTsModule('src/pages/(main)/apps/accounts/vouchers/voucher/drySaveDiff.ts');

const { collectDeepDiffEntries, formatDryDiffValue } = drySaveDiffModule;

test('collectDeepDiffEntries returns empty array when objects are equal', () => {
    const before = {
        voucherNo: '2301',
        lines: [{ ledgerId: 10, amount: 125.5 }]
    };
    const after = {
        voucherNo: '2301',
        lines: [{ ledgerId: 10, amount: 125.5 }]
    };
    assert.equal(JSON.stringify(collectDeepDiffEntries(before, after)), JSON.stringify([]));
});

test('collectDeepDiffEntries returns nested object and array paths for changed values', () => {
    const before = {
        postingDateText: '2026-02-01',
        lines: [
            { ledgerId: 10, amount: 100, drCrFlag: 0 },
            { ledgerId: 20, amount: 50, drCrFlag: 1 }
        ],
        billDetails: []
    };
    const after = {
        postingDateText: '2026-02-02',
        lines: [
            { ledgerId: 10, amount: 100, drCrFlag: 0 },
            { ledgerId: 20, amount: 75, drCrFlag: 1 },
            { ledgerId: 30, amount: 25, drCrFlag: 1 }
        ],
        billDetails: [{ saleInvoiceId: 101, appliedAmount: 25 }]
    };

    const diffPaths = collectDeepDiffEntries(before, after)
        .map((entry) => entry.path)
        .sort();

    assert.equal(
        JSON.stringify(diffPaths),
        JSON.stringify([
            'billDetails[0]',
            'lines[1].amount',
            'lines[2]',
            'postingDateText'
        ])
    );
});

test('formatDryDiffValue truncates long string values and keeps short values unchanged', () => {
    const shortValue = formatDryDiffValue('abc', 20);
    assert.equal(shortValue, '"abc"');

    const longText = 'x'.repeat(200);
    const truncated = formatDryDiffValue(longText, 30);
    assert.equal(truncated.endsWith('...'), true);
    assert.equal(truncated.length <= 30, true);
});

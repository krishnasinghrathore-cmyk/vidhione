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

const saveBehaviorModule = loadTsModule('src/pages/(main)/apps/accounts/vouchers/voucher/saveBehavior.ts');
const preferencesModule = loadTsModule('src/pages/(main)/apps/accounts/vouchers/voucher/preferences.ts');

const { buildPaymentVoucherSaveSuccessMessage, resolvePaymentVoucherPostSaveAction } = saveBehaviorModule;
const {
    PAYMENT_VOUCHER_ADD_ANOTHER_AFTER_SAVE_STORAGE_KEY,
    getStoredAddAnotherAfterSavePreference,
    normalizeAddAnotherAfterSavePreference,
    persistAddAnotherAfterSavePreference
} = preferencesModule;

const withLocalStorage = (storage, callback) => {
    const previousLocalStorage = globalThis.localStorage;
    if (storage) {
        globalThis.localStorage = storage;
    } else {
        delete globalThis.localStorage;
    }

    try {
        callback();
    } finally {
        if (previousLocalStorage) {
            globalThis.localStorage = previousLocalStorage;
        } else {
            delete globalThis.localStorage;
        }
    }
};

const createMemoryStorage = () => {
    const values = new Map();
    return {
        values,
        getItem: (key) => (values.has(key) ? values.get(key) ?? null : null),
        setItem: (key, value) => {
            values.set(key, value);
        }
    };
};

test('new voucher save with toggle off routes to register and uses standard toast text', () => {
    const action = resolvePaymentVoucherPostSaveAction({
        isEditing: false,
        addAnotherAfterSave: false,
        intent: 'primary'
    });
    assert.equal(action, 'open-register');
    assert.equal(buildPaymentVoucherSaveSuccessMessage('PV-101', action), 'Voucher saved #PV-101');
});

test('new voucher save with toggle on keeps form open and uses ready-for-next toast text', () => {
    const action = resolvePaymentVoucherPostSaveAction({
        isEditing: false,
        addAnotherAfterSave: true,
        intent: 'primary'
    });
    assert.equal(action, 'prepare-next');
    assert.equal(
        buildPaymentVoucherSaveSuccessMessage('PV-102', action),
        'Voucher saved #PV-102. Ready for next.'
    );
});

test('ctrl+enter shortcut always forces add-another behavior for new voucher', () => {
    const action = resolvePaymentVoucherPostSaveAction({
        isEditing: false,
        addAnotherAfterSave: false,
        intent: 'addAnotherShortcut'
    });
    assert.equal(action, 'prepare-next');
});

test('edit voucher save keeps edit flow behavior regardless of toggle', () => {
    const action = resolvePaymentVoucherPostSaveAction({
        isEditing: true,
        addAnotherAfterSave: true,
        intent: 'addAnotherShortcut'
    });
    assert.equal(action, 'stay-on-edit');
    assert.equal(buildPaymentVoucherSaveSuccessMessage('PV-201', action), 'Voucher saved #PV-201');
});

test('add another preference parsing and persistence work with localStorage', { concurrency: false }, () => {
    assert.equal(normalizeAddAnotherAfterSavePreference('true'), true);
    assert.equal(normalizeAddAnotherAfterSavePreference('1'), true);
    assert.equal(normalizeAddAnotherAfterSavePreference('false'), false);
    assert.equal(normalizeAddAnotherAfterSavePreference('0'), false);
    assert.equal(normalizeAddAnotherAfterSavePreference('maybe'), null);

    const storage = createMemoryStorage();
    withLocalStorage(storage, () => {
        assert.equal(getStoredAddAnotherAfterSavePreference(), false);

        persistAddAnotherAfterSavePreference(true);
        assert.equal(storage.values.get(PAYMENT_VOUCHER_ADD_ANOTHER_AFTER_SAVE_STORAGE_KEY), '1');
        assert.equal(getStoredAddAnotherAfterSavePreference(), true);

        persistAddAnotherAfterSavePreference(false);
        assert.equal(storage.values.get(PAYMENT_VOUCHER_ADD_ANOTHER_AFTER_SAVE_STORAGE_KEY), '0');
        assert.equal(getStoredAddAnotherAfterSavePreference(), false);
    });
});

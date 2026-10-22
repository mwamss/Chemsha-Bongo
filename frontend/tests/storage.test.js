import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageManager } from '../src/engine/core/Storage.js';

function installBrowserStorage({ failWrites = false } = {}) {
  const values = new Map();
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {
    localStorage: {
      setItem(key, value) {
        if (failWrites && key === 'chemsha_bongo_data_v1') throw new Error('Storage quota exceeded');
        values.set(key, value);
      },
      getItem(key) { return values.get(key) ?? null; },
      removeItem(key) { values.delete(key); },
    },
    dispatchEvent() {},
  };
  return values;
}

test('saves and reloads a reflection with its category and identity', () => {
  const values = installBrowserStorage();
  const storage = new StorageManager();
  storage.saveBanjaEntry({
    id: 'reflection-free-1',
    title: 'A new thought',
    body: 'Some notes to preserve.',
    promptId: null,
    promptCategory: 'Free Expression',
  });

  const restored = new StorageManager();
  const [entry] = restored.getBanjaEntries();
  assert.equal(entry.id, 'reflection-free-1');
  assert.equal(entry.promptCategory, 'Free Expression');
  assert.equal(entry.body, 'Some notes to preserve.');
  assert.ok(entry.updatedAt > 0);
  assert.ok(values.has('chemsha_bongo_data_v1'));
});

test('reports storage write failure while retaining the in-memory copy', () => {
  installBrowserStorage({ failWrites: true });
  const storage = new StorageManager();
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    storage.saveBanjaEntry({ id: 'reflection-memory-only', title: 'Keep this for now', body: 'Draft' });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(storage.getPersistenceStatus(), 'error');
  assert.equal(storage.getBanjaEntries()[0].title, 'Keep this for now');
});

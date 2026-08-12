/**
 * KV storage that prefers AsyncStorage when the native module is linked,
 * otherwise falls back to in-memory (dev client built before pod install).
 */
type KV = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const memory = new Map<string, string>();

const memoryStorage: KV = {
  async getItem(key) {
    return memory.has(key) ? memory.get(key)! : null;
  },
  async setItem(key, value) {
    memory.set(key, value);
  },
  async removeItem(key) {
    memory.delete(key);
  },
};

const createStorage = (): KV => {
  try {
    // Lazy require so a missing native module doesn't crash the import graph.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-async-storage/async-storage') as {
      default?: KV;
    } & KV;
    const AsyncStorage = (mod.default ?? mod) as KV;
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      return AsyncStorage;
    }
  } catch {
    // Native module not in this binary yet — use memory until rebuild.
  }
  return memoryStorage;
};

export const storage = createStorage();

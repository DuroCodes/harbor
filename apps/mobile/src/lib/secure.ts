import * as SecureStore from 'expo-secure-store';

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const SecureKeys = {
  proxyURL: 'harbor.proxy.url',
  proxyAPIKey: 'harbor.proxy.apikey',
  passcodeHash: 'harbor.security.appLockPasscodeHash',
  passcodeLength: 'harbor.security.appLockPasscodeLength',
  biometricsEnabled: 'harbor.security.appLockBiometricsEnabled',
} as const;

export const secureGet = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key, SECURE_OPTS);
  } catch {
    return null;
  }
};

export const secureSet = async (key: string, value: string): Promise<void> => {
  await SecureStore.setItemAsync(key, value, SECURE_OPTS);
};

export const secureDelete = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key, SECURE_OPTS);
  } catch {
    // ignore missing keys
  }
};

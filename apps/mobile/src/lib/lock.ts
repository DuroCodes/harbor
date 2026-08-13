import * as Crypto from 'expo-crypto';

import { SecureKeys, secureDelete, secureGet, secureSet } from '@/lib/secure';

export type AppLockSnapshot = {
  hasPasscode: boolean;
  /** Stored digit count (4–6). Null for passcodes set before length was persisted. */
  passcodeLength: number | null;
  isUnlocked: boolean;
};

const normalize = (passcode: string): string => passcode.replace(/\D/g, '');

export const isValidPasscode = (passcode: string): boolean => {
  const digits = normalize(passcode);
  return digits.length >= 4 && digits.length <= 6;
};

const hashPasscode = (passcode: string): Promise<string> =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalize(passcode)
  );

const parsePasscodeLength = (raw: string | null): number | null => {
  const n = raw ? Number(raw) : NaN;
  return n >= 4 && n <= 6 ? n : null;
};

export const loadAppLockState = async (): Promise<AppLockSnapshot> => {
  const hash = await secureGet(SecureKeys.passcodeHash);
  const lengthRaw = await secureGet(SecureKeys.passcodeLength);
  const hasPasscode = hash != null && hash.length > 0;
  return {
    hasPasscode,
    passcodeLength: hasPasscode ? parsePasscodeLength(lengthRaw) : null,
    isUnlocked: !hasPasscode,
  };
};

export const setPasscode = async (passcode: string): Promise<void> => {
  const digits = normalize(passcode);
  if (!isValidPasscode(digits)) {
    throw new Error('Passcode must be 4–6 digits.');
  }
  const hash = await hashPasscode(digits);
  await secureSet(SecureKeys.passcodeHash, hash);
  await secureSet(SecureKeys.passcodeLength, String(digits.length));
};

export const clearPasscode = async (): Promise<void> => {
  await secureDelete(SecureKeys.passcodeHash);
  await secureDelete(SecureKeys.passcodeLength);
  await secureDelete(SecureKeys.biometricsEnabled);
};

export const verifyPasscode = async (passcode: string): Promise<boolean> => {
  const stored = await secureGet(SecureKeys.passcodeHash);
  if (!stored) return false;
  const hash = await hashPasscode(passcode);
  return hash === stored;
};

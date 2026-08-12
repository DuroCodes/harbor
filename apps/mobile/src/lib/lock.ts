import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

import { SecureKeys, secureDelete, secureGet, secureSet } from '@/lib/secure';

export type AppLockSnapshot = {
  hasPasscode: boolean;
  biometricsEnabled: boolean;
  isUnlocked: boolean;
  biometricsAvailable: boolean;
  biometricsName: string;
};

const normalize = (passcode: string): string => passcode.replace(/\D/g, '');

export const isValidPasscode = (passcode: string): boolean => {
  const digits = normalize(passcode);
  return digits.length >= 4 && digits.length <= 6;
};

const hashPasscode = (passcode: string): Promise<string> =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalize(passcode));

const biometricsMeta = async (): Promise<{
  available: boolean;
  name: string;
}> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const available = hasHardware && enrolled;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  let name = 'Biometrics';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    name = 'Face ID';
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    name = 'Touch ID';
  } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    name = 'Optic ID';
  }
  return { available, name };
};

export const loadAppLockState = async (): Promise<AppLockSnapshot> => {
  const hash = await secureGet(SecureKeys.passcodeHash);
  const bioFlag = await secureGet(SecureKeys.biometricsEnabled);
  const { available, name } = await biometricsMeta();
  const hasPasscode = hash != null && hash.length > 0;
  return {
    hasPasscode,
    biometricsEnabled: bioFlag === '1',
    isUnlocked: !hasPasscode,
    biometricsAvailable: available,
    biometricsName: name,
  };
};

export const setPasscode = async (passcode: string): Promise<void> => {
  const digits = normalize(passcode);
  if (!isValidPasscode(digits)) {
    throw new Error('Passcode must be 4–6 digits.');
  }
  const hash = await hashPasscode(digits);
  await secureSet(SecureKeys.passcodeHash, hash);
  const { available } = await biometricsMeta();
  if (available) {
    await secureSet(SecureKeys.biometricsEnabled, '1');
  }
};

export const clearPasscode = async (): Promise<void> => {
  await secureDelete(SecureKeys.passcodeHash);
  await secureDelete(SecureKeys.biometricsEnabled);
};

export const setBiometricsEnabled = async (enabled: boolean): Promise<void> => {
  await secureSet(SecureKeys.biometricsEnabled, enabled ? '1' : '0');
};

export const verifyPasscode = async (passcode: string): Promise<boolean> => {
  const stored = await secureGet(SecureKeys.passcodeHash);
  if (!stored) return false;
  const hash = await hashPasscode(passcode);
  return hash === stored;
};

export const unlockWithBiometrics = async (): Promise<boolean> => {
  const { available } = await biometricsMeta();
  if (!available) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock to view your finances',
    fallbackLabel: '',
    disableDeviceFallback: true,
    cancelLabel: 'Cancel',
  });
  return result.success;
};

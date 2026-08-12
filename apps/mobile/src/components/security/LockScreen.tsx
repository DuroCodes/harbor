import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { brand, surface } from '@/theme/tokens';
import {
  isValidPasscode,
  unlockWithBiometrics,
  verifyPasscode,
} from '@/lib/lock';

type Props = {
  biometricsEnabled: boolean;
  biometricsAvailable: boolean;
  biometricsName: string;
  onUnlocked: () => void;
};

/**
 * Launch lock screen — Face ID / Touch ID when enabled, else Harbor passcode.
 */
export function LockScreen({
  biometricsEnabled,
  biometricsAvailable,
  biometricsName,
  onUnlocked,
}: Props) {
  const [passcode, setPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPasscodeEntry, setShowPasscodeEntry] = useState(false);
  const [busy, setBusy] = useState(false);

  const preferBiometrics = biometricsEnabled && biometricsAvailable;

  useEffect(() => {
    if (!preferBiometrics) {
      setShowPasscodeEntry(true);
      return;
    }
    void (async () => {
      setBusy(true);
      const ok = await unlockWithBiometrics();
      setBusy(false);
      if (ok) onUnlocked();
      else {
        setShowPasscodeEntry(true);
        setErrorMessage('Try your Harbor passcode.');
      }
    })();
  }, []);

  const attemptPasscode = async (value: string) => {
    const ok = await verifyPasscode(value);
    if (ok) {
      setErrorMessage(null);
      setPasscode('');
      onUnlocked();
    } else {
      setErrorMessage('Incorrect passcode.');
      setPasscode('');
    }
  };

  const onChangePasscode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setPasscode(digits);
    if (isValidPasscode(digits)) {
      void attemptPasscode(digits);
    }
  };

  return (
    <View style={styles.screen}>
      <SymbolView
        name="lock"
        size={40}
        tintColor={surface.labelMuted}
        weight="light"
      />
      <Text style={styles.title}>Harbor</Text>
      <Text style={styles.subtitle}>Unlock to view your finances</Text>

      {busy && !showPasscodeEntry ? (
        <ActivityIndicator color={brand.accent} style={{ marginTop: 24 }} />
      ) : null}

      {showPasscodeEntry || !preferBiometrics ? (
        <View style={styles.passcodeBlock}>
          <TextInput
            value={passcode}
            onChangeText={onChangePasscode}
            placeholder="Passcode"
            placeholderTextColor={surface.labelMuted}
            keyboardType="number-pad"
            secureTextEntry
            textContentType="oneTimeCode"
            autoFocus
            style={styles.field}
          />
          <Pressable
            style={[
              styles.primaryBtn,
              passcode.length < 4 && styles.btnDisabled,
            ]}
            disabled={passcode.length < 4}
            onPress={() => void attemptPasscode(passcode)}
          >
            <Text style={styles.primaryLabel}>Unlock</Text>
          </Pressable>
          {preferBiometrics ? (
            <Pressable
              onPress={() => {
                setShowPasscodeEntry(false);
                setErrorMessage(null);
                void (async () => {
                  setBusy(true);
                  const ok = await unlockWithBiometrics();
                  setBusy(false);
                  if (ok) onUnlocked();
                  else {
                    setShowPasscodeEntry(true);
                    setErrorMessage('Try your Harbor passcode.');
                  }
                })();
              }}
            >
              <Text style={styles.link}>Use {biometricsName}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.passcodeBlock}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              void (async () => {
                setBusy(true);
                const ok = await unlockWithBiometrics();
                setBusy(false);
                if (ok) onUnlocked();
                else {
                  setShowPasscodeEntry(true);
                  setErrorMessage('Try your Harbor passcode.');
                }
              })();
            }}
          >
            <Text style={styles.primaryLabel}>
              Unlock with {biometricsName}
            </Text>
          </Pressable>
          <Pressable onPress={() => setShowPasscodeEntry(true)}>
            <Text style={styles.link}>Use Passcode</Text>
          </Pressable>
        </View>
      )}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: surface.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '500',
    color: surface.label,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: surface.labelMuted,
  },
  passcodeBlock: {
    marginTop: 24,
    width: '100%',
    maxWidth: 260,
    alignItems: 'center',
    gap: 14,
  },
  field: {
    width: '100%',
    backgroundColor: surface.elevated,
    borderRadius: 12,
    padding: 14,
    color: surface.label,
    fontSize: 28,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: brand.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  primaryLabel: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
  link: {
    color: brand.accent,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  error: {
    marginTop: 16,
    color: brand.expensePalette[0],
    fontSize: 13,
  },
});

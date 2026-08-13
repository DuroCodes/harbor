import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { brand, surface } from '@/theme/tokens';
import { verifyPasscode } from '@/lib/lock';

type Props = {
  /** Digit count of the stored passcode, if known. */
  expectedLength: number | null;
  onUnlocked: () => void;
};

/**
 * Launch lock screen — Harbor passcode.
 */
export function LockScreen({ expectedLength, onUnlocked }: Props) {
  const [passcode, setPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attemptId = useRef(0);
  const maxDigits = expectedLength ?? 6;

  const tryPasscode = async (digits: string, showError: boolean) => {
    const id = ++attemptId.current;
    const ok = await verifyPasscode(digits);
    if (id !== attemptId.current) return;
    if (ok) {
      setErrorMessage(null);
      setPasscode('');
      onUnlocked();
      return;
    }
    if (showError) {
      setErrorMessage('Incorrect passcode.');
      setPasscode('');
    }
  };

  const onChangePasscode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, maxDigits);
    setPasscode(digits);
    setErrorMessage(null);
    if (expectedLength) {
      if (digits.length === expectedLength) void tryPasscode(digits, true);
      return;
    }
    if (digits.length >= 4) {
      void tryPasscode(digits, digits.length === 6);
    }
  };

  const canSubmit =
    expectedLength != null
      ? passcode.length === expectedLength
      : passcode.length >= 4;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SymbolView
        name="lock"
        size={40}
        tintColor={surface.labelMuted}
        weight="light"
      />
      <Text style={styles.title}>Harbor</Text>
      <Text style={styles.subtitle}>Unlock to view your finances</Text>

      <View style={styles.passcodeBlock}>
        <TextInput
          value={passcode}
          onChangeText={onChangePasscode}
          placeholder="Passcode"
          placeholderTextColor={surface.labelMuted}
          keyboardType="number-pad"
          secureTextEntry
          textContentType="oneTimeCode"
          maxLength={maxDigits}
          autoFocus
          style={styles.field}
        />
        <Pressable
          style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
          disabled={!canSubmit}
          onPress={() => void tryPasscode(passcode, true)}
        >
          <Text style={styles.primaryLabel}>Unlock</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </KeyboardAvoidingView>
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
  error: {
    marginTop: 16,
    color: brand.expensePalette[0],
    fontSize: 13,
  },
});

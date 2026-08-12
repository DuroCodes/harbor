import {
  BottomSheet,
  Button,
  Group,
  Host,
  HStack,
  Spacer,
  Text,
  TextField,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { brand, surface } from '@/theme/tokens';
import { isValidPasscode, setPasscode } from '@/lib/lock';

type Props = {
  isPresented: boolean;
  changing: boolean;
  onDismiss: () => void;
  onSaved: () => void;
};

export function PasscodeSheet({
  isPresented,
  changing,
  onDismiss,
  onSaved,
}: Props) {
  const { width } = useWindowDimensions();
  const entry = useNativeState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPresented) return;
    setStep('enter');
    setFirst('');
    setErrorMessage(null);
    entry.value = '';
  }, [isPresented]);

  const advance = async () => {
    const digits = String(entry.value ?? '')
      .replace(/\D/g, '')
      .slice(0, 6);
    setErrorMessage(null);
    if (step === 'enter') {
      if (!isValidPasscode(digits)) {
        setErrorMessage('Use 4–6 digits.');
        return;
      }
      setFirst(digits);
      setStep('confirm');
      entry.value = '';
      return;
    }
    if (digits !== first) {
      setErrorMessage('Passcodes didn’t match.');
      entry.value = '';
      return;
    }
    try {
      await setPasscode(digits);
      onSaved();
      onDismiss();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save.');
    }
  };

  return (
    <Host
      colorScheme="dark"
      seedColor={brand.accent}
      style={{ position: 'absolute', width }}
      pointerEvents="none"
    >
      <BottomSheet
        isPresented={isPresented}
        onIsPresentedChange={(open) => {
          if (!open) onDismiss();
        }}
        onDismiss={onDismiss}
      >
        <Group
          modifiers={[
            presentationDetents(['medium']),
            presentationDragIndicator('visible'),
            presentationBackground(surface.canvas),
          ]}
        >
          <VStack
            spacing={20}
            alignment="leading"
            modifiers={[
              padding({ all: 20 }),
              frame({
                maxWidth: Infinity,
                maxHeight: Infinity,
                alignment: 'topLeading',
              }),
              background(surface.canvas),
            ]}
          >
            <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
              <Button
                label="Cancel"
                role="cancel"
                modifiers={[buttonStyle('glass'), tint(brand.accent)]}
                onPress={onDismiss}
              />
              <Spacer />
              <Text
                modifiers={[
                  font({ size: 17, weight: 'semibold' }),
                  foregroundStyle(surface.label),
                ]}
              >
                {changing ? 'Change Passcode' : 'Set Passcode'}
              </Text>
              <Spacer />
              <Button
                label={step === 'enter' ? 'Next' : 'Save'}
                modifiers={[buttonStyle('glassProminent'), tint(brand.accent)]}
                onPress={() => {
                  void advance();
                }}
              />
            </HStack>

            <Text
              modifiers={[
                font({ size: 15 }),
                foregroundStyle(surface.labelMuted),
              ]}
            >
              {step === 'enter'
                ? 'Choose a 4–6 digit passcode'
                : 'Confirm passcode'}
            </Text>

            <TextField
              text={entry}
              placeholder="••••"
              autoFocus
              modifiers={[
                keyboardType('numeric'),
                font({ size: 28, weight: 'medium' }),
                foregroundStyle(surface.label),
                padding({ all: 14 }),
                background(
                  surface.elevated2,
                  shapes.roundedRectangle({
                    cornerRadius: 12,
                    roundedCornerStyle: 'continuous',
                  })
                ),
                frame({ maxWidth: Infinity }),
              ]}
            />

            {errorMessage ? (
              <Text
                modifiers={[
                  font({ size: 13 }),
                  foregroundStyle(brand.expensePalette[0]),
                ]}
              >
                {errorMessage}
              </Text>
            ) : null}
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}

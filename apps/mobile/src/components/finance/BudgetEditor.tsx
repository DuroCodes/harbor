import {
  BottomSheet,
  Button,
  Group,
  Host,
  HStack,
  Image,
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
import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

import { brand, surface } from '@/theme/tokens';
import type { Category } from '@/lib/types';

type Props = {
  category: Category | null;
  onDismiss: () => void;
  onSave: (amount: number | null) => void;
  onClear: () => void;
};

export function BudgetEditor({ category, onDismiss, onSave, onClear }: Props) {
  const { width } = useWindowDimensions();
  const amount = useNativeState('');
  const initial = category?.monthlyBudgetLimit;
  const presented = category != null;

  useEffect(() => {
    if (!category) {
      amount.value = '';
      return;
    }
    amount.value = initial && initial > 0 ? String(initial) : '';
  }, [category?.id, initial]);

  const parseAmount = (): number | null => {
    const cleaned = String(amount.value ?? '')
      .replace(/\$/g, '')
      .replace(/,/g, '')
      .trim();
    if (!cleaned) return null;
    const value = Number(cleaned);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  return (
    <Host
      colorScheme="dark"
      seedColor={brand.accent}
      style={{ position: 'absolute', width }}
      pointerEvents="none"
    >
      <BottomSheet
        isPresented={presented}
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
          {category ? (
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
              {/* Navigation toolbar — Cancel | title | Save (glass) */}
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
                  Edit Budget
                </Text>
                <Spacer />
                <Button
                  label="Save"
                  modifiers={[
                    buttonStyle('glassProminent'),
                    tint(brand.accent),
                  ]}
                  onPress={() => {
                    onSave(parseAmount());
                  }}
                />
              </HStack>

              <HStack spacing={12}>
                <Image
                  systemName={category.systemImage as any}
                  size={22}
                  color={brand.accent}
                  modifiers={[font({ weight: 'light' })]}
                />
                <Text
                  modifiers={[
                    font({ size: 20, weight: 'medium' }),
                    foregroundStyle(surface.label),
                  ]}
                >
                  {category.name}
                </Text>
              </HStack>

              <VStack
                spacing={8}
                alignment="leading"
                modifiers={[frame({ maxWidth: Infinity })]}
              >
                <Text
                  modifiers={[
                    font({ size: 12 }),
                    foregroundStyle(surface.labelMuted),
                  ]}
                >
                  Monthly budget
                </Text>
                <TextField
                  text={amount}
                  placeholder="0.00"
                  autoFocus
                  modifiers={[
                    keyboardType('decimal-pad'),
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
              </VStack>

              <Spacer />

              {(initial ?? 0) > 0 ? (
                <Button
                  label="Remove Budget"
                  role="destructive"
                  modifiers={[
                    buttonStyle('glass'),
                    tint(brand.expensePalette[0]),
                  ]}
                  onPress={onClear}
                />
              ) : null}
            </VStack>
          ) : null}
        </Group>
      </BottomSheet>
    </Host>
  );
}

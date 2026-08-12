import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { brand } from '@/theme/tokens';

/** Chevron-only back control — avoids the "(tabs)" back title from the route group. */
export function HeaderBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <SymbolView
        name="chevron.left"
        size={18}
        tintColor={brand.accent}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  pressed: { opacity: 0.55 },
});

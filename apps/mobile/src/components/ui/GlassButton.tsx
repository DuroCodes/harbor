import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { brand, surface } from '@/theme/tokens';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  children?: React.ReactNode;
  systemImage?: string;
  size?: number;
  /** circular icon control (settings/plus) vs text pill (Edit/Done) */
  variant?: 'icon' | 'text';
  style?: ViewStyle;
};

/**
 * iOS 26 liquid-glass toolbar control. Falls back to translucent fill when glass API missing.
 * Padding lives on the glass shell only — avoid double inset on the inner label.
 */
export function GlassButton({
  onPress,
  accessibilityLabel,
  disabled,
  children,
  systemImage,
  size = 20,
  variant = 'icon',
  style,
}: Props) {
  const glass = isLiquidGlassAvailable();
  const tint = disabled ? surface.labelMuted : brand.accent;

  const content =
    children ??
    (systemImage ? (
      <SymbolView
        name={systemImage as any}
        size={size}
        tintColor={tint}
        weight="medium"
      />
    ) : null);

  const shellStyle = variant === 'icon' ? styles.iconShell : styles.textShell;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.press,
        { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {glass ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          isInteractive
          style={shellStyle}
        >
          {content}
        </GlassView>
      ) : (
        <View style={[shellStyle, styles.fallbackFill]}>{content}</View>
      )}
    </Pressable>
  );
}

export function GlassChrome({
  children,
  style,
  shape = 'circle',
}: {
  children?: React.ReactNode;
  style?: ViewStyle;
  shape?: 'circle' | 'capsule';
}) {
  const glass = isLiquidGlassAvailable();
  if (glass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        style={[shape === 'circle' ? styles.circle : styles.capsule, style]}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        shape === 'circle' ? styles.circle : styles.capsule,
        styles.fallbackFill,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  press: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textShell: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  capsule: {
    width: 36,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  fallbackFill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
});

export function GlassButtonLabel({ children }: { children: string }) {
  return <Text style={stylesLabel.text}>{children}</Text>;
}

const stylesLabel = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.accent,
  },
});

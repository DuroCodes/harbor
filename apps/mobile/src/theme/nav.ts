import { Platform } from 'react-native';

import { brand, surface } from '@/theme/tokens';

/**
 * Native iOS header — no solid fill, so the system scroll-edge fade (soft
 * gradient) can show as content moves under the bar.
 */
export const stackScreenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerTransparent: Platform.OS === 'ios',
  headerTintColor: brand.accent,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTitleStyle: {
    color: surface.label,
    fontWeight: '600' as const,
  },
  headerStyle:
    Platform.OS === 'ios'
      ? { backgroundColor: 'transparent' }
      : { backgroundColor: surface.canvas },
  contentStyle: {
    backgroundColor: surface.canvas,
  },
  ...(Platform.OS === 'ios'
    ? {
        scrollEdgeEffects: {
          top: 'soft' as const,
          bottom: 'automatic' as const,
          left: 'hidden' as const,
          right: 'hidden' as const,
        },
      }
    : {}),
};

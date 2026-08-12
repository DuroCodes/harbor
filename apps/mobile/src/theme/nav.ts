import { Platform } from 'react-native';

import { brand, surface } from '@/theme/tokens';

/**
 * Solid canvas header bar with an iOS 26 soft scroll-edge gradient once content scrolls under it.
 */
export const stackScreenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerTintColor: brand.accent,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTitleStyle: {
    color: surface.label,
    fontWeight: '600' as const,
  },
  headerStyle: {
    backgroundColor: surface.canvas,
  },
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

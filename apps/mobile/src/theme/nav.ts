import { brand, surface } from '@/theme/tokens';

export const stackScreenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerTransparent: false,
  headerTintColor: brand.accent,
  headerBackTitle: '',
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
};

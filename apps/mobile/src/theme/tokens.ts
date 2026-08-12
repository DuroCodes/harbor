import { StyleSheet, type ViewStyle } from 'react-native';

export const brand = {
  name: 'Harbor',
  tagline: 'All accounts. One place.',
  markSystemImage: 'anchor',
  accent: '#61C7D1',
  inflow: '#59C79E',
  outflowSource: '#8C949E',
  expensePalette: [
    '#EB7A61',
    '#F0A352',
    '#9E85E0',
    '#6699EB',
    '#E07094',
    '#7AB88F',
    '#C79966',
    '#9499A8',
  ],
} as const;

export const surface = {
  canvas: '#000000',
  elevated: '#121212',
  elevated2: '#1A1A1A',
  hairline: 'rgba(255,255,255,0.08)',
  labelMuted: 'rgba(255,255,255,0.45)',
  labelSecondary: 'rgba(255,255,255,0.55)',
  label: '#FFFFFF',
} as const;

export const theme = {
  positive: brand.inflow,
  negative: '#FFFFFF',
  muted: surface.labelMuted,
  accent: brand.accent,
  sectionSpacing: 28,
  cardCorner: 14,
  rowSpacing: 4,
  halfTileCardHeight: 120,
  boardColumnSpacing: 12,
  boardRowSpacing: 14,
} as const;

export const typo = {
  heroBalance: {
    fontSize: 40,
    fontWeight: '500' as const,
    fontVariant: ['tabular-nums' as const],
  },
  amount: (size: number, weight: '400' | '500' | '600' = '500') => ({
    fontSize: size,
    fontWeight: weight,
    fontVariant: ['tabular-nums' as const],
  }),
};

export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: surface.canvas,
  },
  screenPadding: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: surface.elevated,
    borderRadius: theme.cardCorner,
    overflow: 'hidden',
  } satisfies ViewStyle,
  cardPadded: {
    backgroundColor: surface.elevated,
    borderRadius: theme.cardCorner,
    padding: 4,
    overflow: 'hidden',
  },
  monospaced: {
    fontVariant: ['tabular-nums'],
  },
});

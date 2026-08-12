import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { theme, surface, layout } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, padding = 0, style }: Props) {
  return <View style={[layout.card, padding > 0 ? { padding } : null, style]}>{children}</View>;
}

export function PaddedCard({ children, style }: Omit<Props, 'padding'>) {
  return <View style={[layout.cardPadded, style]}>{children}</View>;
}

export { theme, surface };

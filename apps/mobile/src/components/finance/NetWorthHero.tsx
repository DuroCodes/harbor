import { StyleSheet, Text, View } from 'react-native';

import { surface, typo, theme } from '@/theme/tokens';
import { format } from '@/lib/format';
import { Card } from '@/components/ui/Card';

type Props = {
  netWorth: number;
  compact?: boolean;
};

export function NetWorthHero({ netWorth, compact = false }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.compactBg]}>
      <Text style={styles.label}>Net worth</Text>
      <Text
        style={[compact ? typo.amount(28) : typo.heroBalance, styles.value]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {format.money(netWorth)}
      </Text>
    </View>
  );
}

export function NetWorthHeroCard(props: Props) {
  if (props.compact) {
    return (
      <Card style={{ padding: 14 }}>
        <NetWorthHero {...props} />
      </Card>
    );
  }
  return <NetWorthHero {...props} />;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'flex-start',
  },
  compactBg: {
    padding: 14,
    backgroundColor: surface.elevated,
    borderRadius: theme.cardCorner,
  },
  label: {
    fontSize: 15,
    color: surface.labelMuted,
    marginBottom: 6,
  },
  value: {
    color: surface.label,
  },
});

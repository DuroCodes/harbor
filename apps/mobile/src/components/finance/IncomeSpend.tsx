import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { surface, theme, typo } from '@/theme/tokens';
import { format } from '@/lib/format';

type Props = {
  income: number;
  spending: number;
  compact?: boolean;
  showsHeader?: boolean;
};

export function IncomeSpend({ income, spending, compact = false, showsHeader = false }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {showsHeader ? <Text style={styles.header}>This month</Text> : null}

      {compact ? (
        <View style={styles.compactCard}>
          <CompactCell title="Income" value={income} positive />
          <View style={{ flex: 1, minHeight: 10 }} />
          <CompactCell title="Spending" value={spending} positive={false} />
        </View>
      ) : (
        <Card>
          <View style={styles.row}>
            <Cell title="Income" value={income} positive />
            <View style={styles.divider} />
            <Cell title="Spending" value={spending} positive={false} />
          </View>
        </Card>
      )}
    </View>
  );
}

function Cell({ title, value, positive }: { title: string; value: number; positive: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.caption}>{title}</Text>
      <Text
        style={[typo.amount(20), { color: positive ? theme.positive : surface.label }]}
        numberOfLines={1}
      >
        {format.money(value)}
      </Text>
    </View>
  );
}

function CompactCell({
  title,
  value,
  positive,
}: {
  title: string;
  value: number;
  positive: boolean;
}) {
  return (
    <View style={styles.compactCell}>
      <Text style={styles.compactCaption}>{title}</Text>
      <Text
        style={[typo.amount(17), { color: positive ? theme.positive : surface.label }]}
        numberOfLines={1}
      >
        {format.money(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  wrapCompact: {
    flex: 1,
  },
  header: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelSecondary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  caption: {
    fontSize: 12,
    color: surface.labelMuted,
    marginBottom: 6,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: surface.hairline,
    marginVertical: 8,
  },
  compactCard: {
    height: theme.halfTileCardHeight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: surface.elevated,
    borderRadius: theme.cardCorner,
  },
  compactCell: {
    gap: 4,
  },
  compactCaption: {
    fontSize: 12,
    color: surface.labelMuted,
  },
});

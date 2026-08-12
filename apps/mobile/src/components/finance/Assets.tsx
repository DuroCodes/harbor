import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Hairline } from '@/components/ui/Hairline';
import { surface, theme, typo } from '@/theme/tokens';
import { format } from '@/lib/format';
import { ACCOUNT_GROUP_META } from '@/lib/types';

type Props = {
  cash: number;
  investments: number;
  credit: number;
  compact?: boolean;
  showsHeader?: boolean;
};

export function Assets({ cash, investments, credit, compact = false, showsHeader = true }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {showsHeader ? <Text style={styles.header}>Assets</Text> : null}

      {compact ? (
        <View style={styles.compactCard}>
          <CompactRow title="Cash" value={cash} />
          <Hairline leadingInset={12} />
          <CompactRow title="Invested" value={investments} />
          <Hairline leadingInset={12} />
          <CompactRow title="Credit" value={credit} />
        </View>
      ) : (
        <Card padding={4}>
          <FullRow title="Cash" systemImage={ACCOUNT_GROUP_META.cash.systemImage} value={cash} />
          <Hairline leadingInset={52} />
          <FullRow
            title="Invested"
            systemImage={ACCOUNT_GROUP_META.investments.systemImage}
            value={investments}
          />
          <Hairline leadingInset={52} />
          <FullRow
            title="Credit"
            systemImage={ACCOUNT_GROUP_META.credit.systemImage}
            value={credit}
          />
        </Card>
      )}
    </View>
  );
}

function FullRow({
  title,
  systemImage,
  value,
}: {
  title: string;
  systemImage: string;
  value: number;
}) {
  return (
    <View style={styles.fullRow}>
      <SymbolView
        name={systemImage as any}
        size={15}
        tintColor={surface.labelMuted}
        weight="light"
        style={styles.icon}
      />
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={[typo.amount(20), styles.amount]} numberOfLines={1}>
        {format.money(value)}
      </Text>
    </View>
  );
}

function CompactRow({ title, value }: { title: string; value: number }) {
  return (
    <View style={styles.compactRow}>
      <Text style={styles.compactTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[typo.amount(12), styles.amount, styles.compactAmount]} numberOfLines={1}>
        {format.money(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  wrapCompact: { flex: 1 },
  header: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelSecondary,
    marginBottom: 12,
  },
  compactCard: {
    height: theme.halfTileCardHeight,
    backgroundColor: surface.elevated,
    borderRadius: theme.cardCorner,
    overflow: 'hidden',
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: { width: 24, height: 24 },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    color: surface.labelMuted,
  },
  amount: { color: surface.label },
  compactRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minHeight: 0,
  },
  compactTitle: {
    fontSize: 12,
    color: surface.labelMuted,
    flexShrink: 1,
    marginRight: 6,
  },
  compactAmount: {
    flexShrink: 0,
    textAlign: 'right',
  },
});

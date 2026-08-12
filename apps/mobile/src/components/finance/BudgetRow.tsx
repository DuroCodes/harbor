import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { brand, surface, typo } from '@/theme/tokens';
import { format } from '@/lib/format';
import type { CategoryBudgetProgress } from '@/lib/types';

type Props = {
  item: CategoryBudgetProgress;
  compact?: boolean;
};

export function BudgetRow({ item, compact = false }: Props) {
  const barColor = item.isOverBudget
    ? brand.expensePalette[0]
    : item.fractionUsed >= 0.85
      ? brand.expensePalette[1]
      : brand.accent;

  const statusText = item.isOverBudget
    ? `${format.money(item.spent - item.limit)} over`
    : `${format.money(item.remaining)} left`;

  const detailText = `${format.money(item.spent)} of ${format.money(item.limit)}`;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.top}>
        <SymbolView
          name={item.systemImage as any}
          size={15}
          tintColor={surface.labelMuted}
          weight="light"
          style={styles.icon}
        />
        <View style={styles.mid}>
          <Text style={styles.name} numberOfLines={1}>
            {item.categoryName}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {detailText}
          </Text>
        </View>
        <Text
          style={[
            typo.amount(17, '500'),
            {
              color: item.isOverBudget
                ? brand.expensePalette[0]
                : surface.label,
            },
          ]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width:
                `${Math.max(2, Math.min(item.fractionUsed, 1) * 100)}%` as any,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wrapCompact: {
    paddingVertical: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Match TransactionRow icon box so SF Symbols don’t blow up the row.
  icon: {
    width: 22,
    height: 22,
    marginRight: 2,
  },
  mid: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 17,
    fontWeight: '500',
    color: surface.label,
  },
  detail: {
    fontSize: 12,
    color: surface.labelMuted,
    marginTop: 2,
  },
  barTrack: {
    height: 3,
    marginTop: 6,
    marginLeft: 36,
    borderRadius: 1.5,
    backgroundColor: surface.hairline,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 1.5,
    minWidth: 3,
  },
});

import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Hairline } from '@/components/ui/Hairline';
import { BudgetRow } from '@/components/finance/BudgetRow';
import { surface } from '@/theme/tokens';
import type { CategoryBudgetProgress } from '@/lib/types';

type Props = {
  items: CategoryBudgetProgress[];
  emptyMessage?: string;
  compact?: boolean;
};

export function BudgetList({
  items,
  emptyMessage = 'Set category budgets to track spending.',
  compact = false,
}: Props) {
  if (items.length === 0) {
    return (
      <Card style={{ padding: 16 }}>
        <Text style={styles.empty}>{emptyMessage}</Text>
      </Card>
    );
  }

  return (
    <Card>
      {items.map((item, index) => (
        <View key={item.id}>
          <BudgetRow item={item} compact={compact} />
          {index < items.length - 1 ? <Hairline leadingInset={50} /> : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 15,
    color: surface.labelMuted,
  },
});

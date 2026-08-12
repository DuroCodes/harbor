import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Hairline } from '@/components/ui/Hairline';
import { TransactionRow } from '@/components/rows/TransactionRow';
import { surface } from '@/theme/tokens';
import type { Category, Transaction } from '@/lib/types';

type Props = {
  transactions: Transaction[];
  categoriesById: Record<string, Category>;
  compact?: boolean;
  showsHeader?: boolean;
  onHeaderTap?: () => void;
  onTransactionTap?: (txn: Transaction) => void;
};

export function RecentTxns({
  transactions,
  categoriesById,
  compact = false,
  showsHeader = true,
  onHeaderTap,
  onTransactionTap,
}: Props) {
  return (
    <View style={styles.wrap}>
      {showsHeader ? (
        <Pressable onPress={onHeaderTap} disabled={!onHeaderTap}>
          <Text style={[styles.header, { marginBottom: compact ? 8 : 12 }]}>
            Recent
          </Text>
        </Pressable>
      ) : null}

      {transactions.length === 0 ? (
        <Card style={{ padding: 16 }}>
          <Text style={styles.empty}>No recent activity.</Text>
        </Card>
      ) : (
        <Card>
          {transactions.map((txn, index) => (
            <View key={txn.id}>
              <Pressable
                onPress={() => onTransactionTap?.(txn)}
                disabled={!onTransactionTap}
                style={{
                  paddingHorizontal: compact ? 10 : 14,
                  paddingVertical: compact ? 8 : 10,
                }}
              >
                <TransactionRow
                  transaction={txn}
                  category={
                    txn.categoryID ? categoriesById[txn.categoryID] : null
                  }
                />
              </Pressable>
              {index < transactions.length - 1 ? (
                <Hairline leadingInset={compact ? 10 : 50} />
              ) : null}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  header: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelSecondary,
  },
  empty: {
    fontSize: 15,
    color: surface.labelMuted,
  },
});

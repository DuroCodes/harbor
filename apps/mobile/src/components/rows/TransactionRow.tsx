import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { brand, surface, theme, typo } from '@/theme/tokens';
import { format } from '@/lib/format';
import {
  signedAmountForDisplay,
  transactionDisplayMerchant,
  type Category,
  type Transaction,
} from '@/lib/types';

type Props = {
  transaction: Transaction;
  category?: Category | null;
};

export function TransactionRow({ transaction, category }: Props) {
  const signed = signedAmountForDisplay(transaction.amount);
  const symbol = category?.systemImage ?? 'ellipsis.circle';

  return (
    <View style={styles.row} accessibilityRole="summary">
      <SymbolView
        name={symbol as any}
        size={15}
        tintColor={surface.labelMuted}
        weight="light"
        style={styles.icon}
      />
      <View style={styles.mid}>
        <Text style={styles.merchant} numberOfLines={1}>
          {transactionDisplayMerchant(transaction)}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{format.shortDate(transaction.date)}</Text>
          {transaction.status === 'pending' ? (
            <>
              <Text style={styles.metaText}> · </Text>
              <Text style={[styles.metaText, { color: `${brand.accent}D9` }]}>Pending</Text>
            </>
          ) : null}
        </View>
      </View>
      <Text
        style={[typo.amount(17, '500'), { color: signed >= 0 ? theme.positive : surface.label }]}
        numberOfLines={1}
      >
        {format.signedMoney(signed)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 22,
    height: 22,
    marginRight: 2,
  },
  mid: {
    flex: 1,
    minWidth: 0,
  },
  merchant: {
    fontSize: 17,
    fontWeight: '500',
    color: surface.label,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: surface.labelMuted,
  },
});
